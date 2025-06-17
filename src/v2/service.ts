import {
  Agent,
  AgentInputItem,
  FunctionCallItem,
  ModelProvider,
  Runner,
} from '@openai/agents';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { createCodeAgent } from './agents/code';
import { createPlanAgent } from './agents/plan';
import { Context, PromptContext } from './context';
import { MCPManager } from './mcp';
import { parseMessage } from './parseMessage';
import { getDefaultModelProvider } from './provider';
import { Tools } from './tool';
import { createBashTool } from './tools/bash';
import { createEditTool } from './tools/edit';
import { createFetchTool } from './tools/fetch';
import { createGlobTool } from './tools/glob';
import { createGrepTool } from './tools/grep';
import { createLSTool } from './tools/ls';
import { createReadTool } from './tools/read';
import { createWriteTool } from './tools/write';

let mcpManager: MCPManager | null = null;

export type AgentType = 'code' | 'plan';

export interface ServiceOpts {
  agentType: AgentType;
  id?: string;
  cwd?: string;
  argvConfig?: Record<string, any>;
  modelProvider?: ModelProvider;
  context?: Context;
}

export interface ServiceRunOpts {
  input: AgentInputItem[];
}

export interface ServiceRunResult {
  stream: Readable;
}

export class Service {
  private opts: ServiceOpts;
  private tools?: Tools;
  private agent?: Agent;
  private initialized: boolean = false;
  context: Context;
  history: AgentInputItem[] = [];
  id: string;

  constructor(opts: ServiceOpts) {
    this.opts = opts;
    this.id = opts.id || randomUUID();
    this.context =
      opts.context ||
      new Context({
        cwd: opts.cwd,
        argvConfig: opts.argvConfig,
      });
  }

  async init() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    const context = this.context;
    if (!mcpManager) {
      mcpManager = new MCPManager(context.configManager.config.mcpServers);
      await mcpManager.connect();
    }
    this.tools = new Tools(
      this.opts.agentType === 'code'
        ? await this.getCodeTools()
        : await this.getPlanTools(),
    );
    const createAgentOpts = {
      tools: this.tools,
      context: this.context,
      fc: false,
    };
    this.agent =
      this.opts.agentType === 'code'
        ? createCodeAgent({
            model: this.context.configManager.config.model,
            ...createAgentOpts,
          })
        : createPlanAgent({
            model: this.context.configManager.config.planModel,
            ...createAgentOpts,
          });
  }

  async destroy() {
    if (mcpManager) {
      await mcpManager.destroy();
      mcpManager = null;
    }
  }

  async getPlanTools() {
    const context = this.context;
    return [
      createReadTool({ context }),
      createLSTool({ context }),
      createGlobTool({ context }),
      createGrepTool({ context }),
      createFetchTool({ context }),
    ];
  }

  async getCodeTools() {
    const context = this.context;
    const mcpTools = await mcpManager!.getAllTools();
    return [
      createWriteTool({ context }),
      createReadTool({ context }),
      createLSTool({ context }),
      createEditTool({ context }),
      createBashTool({ context }),
      createGlobTool({ context }),
      createGrepTool({ context }),
      createFetchTool({ context }),
      ...mcpTools,
    ];
  }

  async run(opts: ServiceRunOpts): Promise<ServiceRunResult> {
    const stream = new Readable({
      read() {},
    });
    const input = await (async () => {
      const promptContext = new PromptContext({
        context: this.context,
        prompts: [],
      });
      const promptContextMessage = {
        role: 'system' as const,
        content: await promptContext.getContext(),
      };
      const prevInput =
        this.history.filter((item) => (item as any).role !== 'system') || [];
      return [promptContextMessage, ...prevInput, ...opts.input];
    })();
    this.processStream(input, stream).catch((error) => {
      stream.emit('error', error);
    });
    return { stream };
  }

  private async processStream(input: AgentInputItem[], stream: Readable) {
    try {
      const runner = new Runner({
        modelProvider: this.opts.modelProvider || getDefaultModelProvider(),
        modelSettings: {
          providerData: {
            providerMetadata: {
              google: {
                thinkingConfig: {
                  includeThoughts: process.env.THINKING ? true : false,
                },
              },
            },
          },
        },
      });
      const result = await runner.run(this.agent!, input, {
        stream: true,
      });
      let text = '';
      for await (const chunk of result.toStream()) {
        if (
          chunk.type === 'raw_model_stream_event' &&
          chunk.data.type === 'model'
        ) {
          switch (chunk.data.event.type) {
            case 'text-delta':
              const textDelta = chunk.data.event.textDelta;
              text += textDelta;
              const parsed = parseMessage(text);
              if (parsed[0]?.type === 'text' && parsed[0].partial) {
                stream.push(
                  JSON.stringify({
                    type: 'text-delta',
                    content: textDelta,
                    partial: true,
                  }) + '\n',
                );
              }
              break;
            case 'reasoning':
              stream.push(
                JSON.stringify({
                  type: 'reasoning',
                  content: chunk.data.event.textDelta,
                }) + '\n',
              );
              break;
            default:
              break;
          }
        }
      }
      const parsed = parseMessage(text);
      if (parsed[0]?.type === 'text') {
        stream.push(
          JSON.stringify({ type: 'text', content: parsed[0].content }) + '\n',
        );
      }
      const history = result.history;
      const toolUse = parsed.find((item) => item.type === 'tool_use');
      if (toolUse) {
        const callId = crypto.randomUUID();
        stream.push(
          JSON.stringify({
            type: 'tool_use',
            name: toolUse.name,
            params: toolUse.params,
            callId,
          }) + '\n',
        );
        history.push({
          type: 'function_call',
          name: toolUse.name,
          arguments: JSON.stringify(toolUse.params),
          callId,
        } as FunctionCallItem);
      }
      stream.push(null);
      this.history = history;
    } catch (error) {
      stream.emit('error', error);
    }
  }

  async callTool(callId: string, name: string, params: Record<string, any>) {
    const result = await this.tools!.invoke(
      name,
      JSON.stringify(params),
      this.context,
    );
    this.history.push({
      type: 'function_call_result',
      name,
      output: {
        type: 'text',
        text: result,
      },
      status: 'completed',
      callId,
    });
    return result;
  }
}
