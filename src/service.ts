import { Agent, AgentInputItem, Runner } from '@openai/agents';
import createDebug from 'debug';
import { Readable } from 'stream';
import { createCodeAgent } from './agents/code';
import { createPlanAgent } from './agents/plan';
import { Context } from './context';
import { PluginHookType } from './plugin';
import { Tools, enhanceTool } from './tool';
import { createBashTool } from './tools/bash';
import { createEditTool } from './tools/edit';
import { createFetchTool } from './tools/fetch';
import { createGlobTool } from './tools/glob';
import { createGrepTool } from './tools/grep';
import { createLSTool } from './tools/ls';
import { createReadTool } from './tools/read';
import { createWriteTool } from './tools/write';
import { formatToolUse } from './utils/formatToolUse';
import { parseMessage } from './utils/parse-message';
import { randomUUID } from './utils/randomUUID';

const debug = createDebug('takumi:service');

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
  abortSignal?: AbortSignal;
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
      enhanceTool(createLSTool({ context }), {
        category: 'read',
        riskLevel: 'low',
      }),
      enhanceTool(createGlobTool({ context }), {
        category: 'read',
        riskLevel: 'low',
      }),
      enhanceTool(createGrepTool({ context }), {
        category: 'read',
        riskLevel: 'low',
      }),
      enhanceTool(createFetchTool({ context }), {
        category: 'network',
        riskLevel: 'medium',
      }),
    ];
    const writeTools = [
      enhanceTool(createWriteTool({ context }), {
        category: 'write',
        riskLevel: 'medium',
      }),
      enhanceTool(createEditTool({ context }), {
        category: 'write',
        riskLevel: 'medium',
      }),
      createBashTool({ context }),
    ];
    const mcpTools = context.mcpTools.map((tool) =>
      enhanceTool(tool, { category: 'network', riskLevel: 'medium' }),
    );
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
    if (opts.abortSignal?.aborted) {
      debug('Request already cancelled, not executing run');
      throw new DOMException('The operation was aborted', 'AbortError');
    }

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

    this.#processStream(input, stream, opts.thinking, opts.abortSignal).catch(
      (error) => {
        stream.emit('error', error);
      },
    );
    return { stream };
  }

  async #processStream(
    input: AgentInputItem[],
    stream: Readable,
    thinking?: boolean,
    abortSignal?: AbortSignal,
  ) {
    try {
      if (abortSignal?.aborted) {
        debug('Request already cancelled, not processing stream');
        throw new DOMException('The operation was aborted', 'AbortError');
      }

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
      try {
        const resultStream = result.toStream();

        for await (const chunk of resultStream) {
          if (abortSignal?.aborted) {
            debug('Detected cancellation, stopping stream processing');
            throw new DOMException('The operation was aborted', 'AbortError');
          }

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
      } catch (error) {
        if (abortSignal?.aborted) {
          debug('Caught error, detected cancellation');
          throw new DOMException('The operation was aborted', 'AbortError');
        }
        throw error;
      }

      // Final check for cancellation
      if (abortSignal?.aborted) {
        debug('Final check detected cancellation');
        throw new DOMException('The operation was aborted', 'AbortError');
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
        const callId = randomUUID();
        stream.push(
          JSON.stringify({
            type: 'tool_use',
            name: toolUse.name,
            params: toolUse.params,
            callId,
          }) + '\n',
        );
        // TODO: use formatToolUse instead of the following code
        // history.push({
        //   role: 'assistant',
        //   type: 'message',
        //   content: [
        //     {
        //       type: 'output_text',
        //       text: JSON.stringify({
        //         type: 'function_call',
        //         name: toolUse.name,
        //         arguments: JSON.stringify(toolUse.params),
        //         callId,
        //       }),
        //     },
        //   ],
        //   status: 'in_progress',
        // });
      }
      stream.push(null);
      this.history = history;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        debug('Caught AbortError, terminating stream processing');
        stream.push(null);
        return;
      }
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

    this.history.push(formatToolUse({ name, params, result, callId }));
    return result;
  }

  async shouldApprove(
    name: string,
    params: Record<string, any>,
  ): Promise<boolean> {
    return await this.tools.shouldApprove(name, params, this.context);
  }
}
