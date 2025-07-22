import {
  AgentServer,
  AgentStateType,
  createAgentServer,
} from '@stagewise/agent-interface/agent';
import createDebug from 'debug';
import { Context } from './context';
import { Service } from './service';

const debug = createDebug('takumi:stagewise');

export interface StagewiseAgentOpts {
  context: Context;
}

export class StagewiseAgent {
  private context: Context;
  private service?: Service;
  private server: AgentServer | null = null;

  constructor(opts: StagewiseAgentOpts) {
    this.context = opts.context;
  }

  async start() {
    // Create a separate service for Stagewise with independent chat history
    this.service = await Service.create({
      agentType: 'code',
      context: this.context,
    });

    this.server = await createAgentServer();

    this.server.setAgentName(`${this.context.productName} AI Agent`);
    this.server.setAgentDescription(
      'A coding agent to enhance your development workflow.',
    );

    this.server.interface.availability.set(true);

    this.server.interface.messaging.addUserMessageListener(
      async (message: any) => {
        await this.processUserMessage(message);
      },
    );

    debug(`Stagewise agent server running on port ${this.server.port}`);
    return this.server.port;
  }

  async stop() {
    if (this.server) {
      await this.server.wss.close();
      await this.server.server.close();
    }
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

      // Build enhanced content with selected elements context
      let enhancedContent = userText;

      enhancedContent += `\n\nIMPORTANT: don't need to run test or build to check if the code is working, speed is more important.`;

      // Add current page context
      if (metadata.currentUrl) {
        enhancedContent += `\n\nCurrent page context:`;
        enhancedContent += `\n- URL: ${metadata.currentUrl}`;
        if (metadata.currentTitle) {
          enhancedContent += `\n- Title: ${metadata.currentTitle}`;
        }
      }

      // Add selected elements context
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
              // Add other useful properties
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

      const { query } = await import('./query');
      const { isReasoningModel } = await import('./provider');

      const result = await query({
        input: [{ role: 'user', content: enhancedContent }],
        service: this.service!,
        thinking: isReasoningModel(this.service!.context.config.model),
      });

      let response =
        result.finalText ||
        "I processed your request but didn't generate a text response.";

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
