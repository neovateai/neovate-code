import { type Context, type Plugin, _Project as Project } from '@neovate/code';
import {
  type AgentServer,
  AgentStateType,
  createAgentServer,
} from '@stagewise/agent-interface/agent';
import createDebug from 'debug';
import os from 'os';

const debug = createDebug('neovate:plugins:stagewise');

export const createStagewisePlugin = () => {
  let sw: StagewiseAgent | null = null;

  return {
    name: 'stagewise',

    async initialized(this: Context) {
      try {
        sw = new StagewiseAgent({
          context: this,
        });
        await sw.start();
        debug(`Stagewise agent started on port ${sw.port}`);
      } catch (error) {
        debug('Failed to start Stagewise agent:', error);
      }
    },

    async destroy() {
      await sw?.stop();
    },

    async status(this: Context) {
      const port = sw?.port;
      const status = port ? `Connected, port: ${port}` : 'Disconnected';
      return {
        Stagewise: {
          items: [status],
        },
      };
    },
  } as Plugin;
};

export interface StagewiseAgentOpts {
  context: Context;
}

export class StagewiseAgent {
  private context: Context;
  private server: AgentServer | null = null;
  private activeProjects: Map<string, Project> = new Map();
  public port: number = 0;

  constructor(opts: StagewiseAgentOpts) {
    this.context = opts.context;
  }

  async start() {
    this.server = await createAgentServer();

    this.server.setAgentName(`${this.context.productName} AI Agent`);
    this.server.setAgentDescription(relativeToHome(this.context.cwd));

    this.server.interface.availability.set(true);

    this.server.interface.messaging.addUserMessageListener(
      async (message: any) => {
        await this.processUserMessage(message);
      },
    );

    this.port = this.server.port;
    debug(`Stagewise agent server running on port ${this.port}`);
    return this.port;
  }

  async stop() {
    if (this.server) {
      await this.server.wss.close();
      await this.server.server.close();
    }
    this.activeProjects.clear();
  }

  private getOrCreateProject(connectionId: string): Project {
    if (!this.activeProjects.has(connectionId)) {
      const project = new Project({
        context: this.context,
      });
      this.activeProjects.set(connectionId, project);
    }
    return this.activeProjects.get(connectionId)!;
  }

  private async processUserMessage(message: any) {
    try {
      this.server!.interface.state.set(
        AgentStateType.THINKING,
        'Processing your request...',
      );

      const userText = message.contentItems
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text)
        .join('\n');

      if (!userText.trim()) {
        this.server!.interface.messaging.set([
          {
            type: 'text',
            text: 'I need some text input to process your request.',
          },
        ]);
        this.server!.interface.state.set(AgentStateType.IDLE);
        return;
      }

      debug('Processing user message:', userText);

      const { metadata } = message;
      const connectionId = message.connectionId || 'default';

      let enhancedContent = userText;

      enhancedContent += `\n\nIMPORTANT: don't need to run test or build to check if the code is working, speed is more important.`;

      if (metadata.currentUrl) {
        enhancedContent += `\n\nCurrent page context:`;
        enhancedContent += `\n- URL: ${metadata.currentUrl}`;
        if (metadata.currentTitle) {
          enhancedContent += `\n- Title: ${metadata.currentTitle}`;
        }
      }

      if (metadata.selectedElements && metadata.selectedElements.length > 0) {
        enhancedContent += `\n\nSelected elements context (${metadata.selectedElements.length} element(s)):`;

        metadata.selectedElements.forEach((element: any, index: number) => {
          enhancedContent += `\n\nElement ${index + 1}:`;
          enhancedContent += `\n- Type: ${element.nodeType}`;

          if (element.textContent) {
            const textPreview = element.textContent.substring(0, 200);
            enhancedContent += `\n- Text content: ${textPreview}${element.textContent.length > 200 ? '...' : ''}`;
          }

          if (element.ownProperties) {
            const keys = Object.keys(element.ownProperties);
            keys.forEach((property) => {
              const val = element.ownProperties[property];
              if (val && val._debugSource) {
                enhancedContent += `\n- ${property} debug source: ${JSON.stringify(val._debugSource)}`;
              }
              if (val && val.value && val.value._debugSource) {
                enhancedContent += `\n- ${property} value debug source: ${val.value._debugSource}`;
              }
              if (val && typeof val === 'string' && val.length < 100) {
                enhancedContent += `\n- ${property}: ${val}`;
              }
            });
          }
        });
      }

      this.server!.interface.state.set(
        AgentStateType.WORKING,
        'Generating response...',
      );

      const project = this.getOrCreateProject(connectionId);

      const result = await project.send(enhancedContent, {
        onToolApprove: () => Promise.resolve(true),
        onTextDelta: async (text: string) => {
          this.server!.interface.messaging.set([
            {
              type: 'text',
              text,
            },
          ]);
        },
      });

      let response: string;
      if (result.success) {
        response = result.data.text || 'I processed your request successfully.';
      } else {
        response = `I encountered an error: ${result.error.message}`;
      }

      this.server!.interface.messaging.set([
        {
          type: 'text',
          text: response,
        },
      ]);

      this.server!.interface.state.set(
        AgentStateType.COMPLETED,
        'Response ready!',
      );

      setTimeout(() => {
        this.server!.interface.state.set(AgentStateType.IDLE);
      }, 100);
    } catch (error) {
      debug('Error processing user message:', error);

      this.server!.interface.messaging.set([
        {
          type: 'text',
          text: `I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ]);

      this.server!.interface.state.set(AgentStateType.IDLE);
    }
  }
}

export function relativeToHome(p: string) {
  return p.replace(os.homedir(), '~');
}
