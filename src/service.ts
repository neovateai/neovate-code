import {
  Agent,
  AgentInputItem,
  FunctionCallItem,
  Runner,
} from '@openai/agents';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { createCodeAgent } from './agents/code';
import { createPlanAgent } from './agents/plan';
import { Context } from './context';
import { PluginHookType } from './plugin';
import { Tools } from './tool';
import { createBashTool } from './tools/bash';
import { createEditTool } from './tools/edit';
import { createFetchTool } from './tools/fetch';
import { createGlobTool } from './tools/glob';
import { createGrepTool } from './tools/grep';
import { createLSTool } from './tools/ls';
import { createReadTool } from './tools/read';
import { createWriteTool } from './tools/write';
import { parseMessage } from './utils/parse-message';

export type AgentType = 'code' | 'plan';

export type ServiceOpts = CreateServiceOpts & {
  tools: Tools;
};

export interface CreateServiceOpts {
  context: Context;
  agentType: AgentType;
  id?: string;
}

export interface ServiceRunOpts {
  input: AgentInputItem[];
  thinking?: boolean;
}

export interface ServiceRunResult {
  stream: Readable;
}

export class Service {
  private opts: ServiceOpts;
  private tools: Tools;
  protected agent?: Agent;
  context: Context;
  history: AgentInputItem[] = [];
  id: string;

  constructor(opts: ServiceOpts) {
    this.opts = opts;
    this.id = opts.id || randomUUID();
    this.context = opts.context;
    this.tools = opts.tools;
    this.agent =
      this.opts.agentType === 'code'
        ? createCodeAgent({
            model: this.context.config.model,
            tools: this.tools,
            context: this.context,
          })
        : createPlanAgent({
            model: this.context.config.planModel,
            tools: this.tools,
            context: this.context,
          });
  }

  static async create(opts: CreateServiceOpts) {
    const context = opts.context;
    const readonlyTools = [
      createReadTool({ context }),
      createLSTool({ context }),
      createGlobTool({ context }),
      createGrepTool({ context }),
      createFetchTool({ context }),
    ];
    const writeTools = [
      createWriteTool({ context }),
      createEditTool({ context }),
      createBashTool({ context }),
    ];
    const mcpTools = context.mcpTools;
    const planTools = [...readonlyTools];
    const codeTools = [...readonlyTools, ...writeTools, ...mcpTools];
    let tools = opts.agentType === 'code' ? codeTools : planTools;
    tools = await context.apply({
      hook: 'tool',
      args: [
        {
          agentType: opts.agentType,
        },
      ],
      memo: tools,
      type: PluginHookType.SeriesMerge,
    });

    return new Service({
      ...opts,
      tools: new Tools(tools),
    });
  }

  async run(opts: ServiceRunOpts): Promise<ServiceRunResult> {
    const stream = new Readable({
      read() {},
    });
    const input = await (async () => {
      const systemPromptStrs = await this.context.buildSystemPrompts();
      const systemPrompts = systemPromptStrs.map((str) => ({
        role: 'system' as const,
        content: str,
      }));
      const prevInput =
        this.history.filter((item) => (item as any).role !== 'system') || [];
      return [...systemPrompts, ...prevInput, ...opts.input];
    })();
    this.#processStream(input, stream, opts.thinking).catch((error) => {
      stream.emit('error', error);
    });
    return { stream };
  }

  async #processStream(
    input: AgentInputItem[],
    stream: Readable,
    thinking?: boolean,
  ) {
    try {
      const runner = new Runner({
        modelProvider: this.opts.context.getModelProvider(),
        modelSettings: {
          providerData: {
            providerMetadata: {
              google: {
                thinkingConfig: {
                  includeThoughts: thinking ?? false,
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

      // hook query
      await this.context.apply({
        hook: 'query',
        args: [
          {
            text,
            parsed,
            input,
            usage: result.state.toJSON().lastModelResponse?.usage,
          },
        ],
        type: PluginHookType.Series,
      });

      const history: AgentInputItem[] = result.history;
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
          role: 'assistant',
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                type: 'function_call',
                name: toolUse.name,
                arguments: JSON.stringify(toolUse.params),
                callId,
              }),
            },
          ],
          status: 'in_progress',
        });
      }
      stream.push(null);
      this.history = history;
    } catch (error) {
      stream.emit('error', error);
    }
  }

  async callTool(callId: string, name: string, params: Record<string, any>) {
    await this.context.apply({
      hook: 'toolUse',
      args: [
        {
          callId,
          name,
          params,
        },
      ],
      type: PluginHookType.Series,
    });
    const result = await this.tools!.invoke(
      name,
      JSON.stringify(params),
      this.context,
    );

    await this.context.apply({
      hook: 'toolUseResult',
      args: [
        {
          callId,
          name,
          params,
          result,
        },
      ],
      type: PluginHookType.Series,
    });

    this.history.push({
      role: 'assistant',
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: JSON.stringify({
            type: 'function_call_result',
            name,
            result,
            callId,
          }),
        },
      ],
      status: 'completed',
    });
    return result;
  }
}
