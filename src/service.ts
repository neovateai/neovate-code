import { Agent, AgentInputItem, Runner } from '@openai/agents';
import createDebug from 'debug';
import { Readable } from 'stream';
import { createCodeAgent } from './agents/code';
import { createPlanAgent } from './agents/plan';
import { MIN_TOKEN_THRESHOLD, OUTPUT_TOKEN_MAX } from './constants';
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
import { createTodoTool } from './tools/todo';
import { createWriteTool } from './tools/write';
import { generateSummaryMessage } from './utils/compact';
import { formatToolUse } from './utils/formatToolUse';
import { parseMessage } from './utils/parse-message';
import { randomUUID } from './utils/randomUUID';
import { Usage } from './utils/usage';

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
  private textBuffer: string = '';
  private usage: Usage;
  private lastUsage: Usage;
  private modelId: string;

  constructor(opts: ServiceOpts) {
    this.opts = opts;
    this.id = opts.id || randomUUID();
    this.context = opts.context;
    this.tools = opts.tools;
    this.modelId =
      this.opts.agentType === 'code'
        ? this.context.config.model
        : this.context.config.planModel;
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
    this.usage = new Usage();
    this.lastUsage = new Usage();
  }

  private hasIncompleteXmlTag(text: string): boolean {
    const incompletePatterns = [
      '<use_tool',
      '<tool_name',
      '<arguments',
      '</use_tool',
      '</tool_name',
      '</arguments',
    ];

    // More efficient approach: check all possible suffixes at once
    for (const pattern of incompletePatterns) {
      // Check for exact match first (most common case)
      if (text.endsWith(pattern)) {
        return true;
      }

      // Only check partial matches if text is shorter than pattern
      if (text.length < pattern.length) {
        if (
          pattern.startsWith(text.slice(-Math.min(text.length, pattern.length)))
        ) {
          return true;
        }
      } else {
        // For longer text, check if any suffix matches pattern prefix
        const maxCheck = Math.min(pattern.length - 1, text.length);
        for (let i = 1; i <= maxCheck; i++) {
          if (text.slice(-i) === pattern.slice(0, i)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private pushTextDelta(stream: Readable, content: string, text: string): void {
    const parsed = parseMessage(text);
    if (parsed[0]?.type === 'text' && parsed[0].partial) {
      stream.push(
        JSON.stringify({
          type: 'text-delta',
          content,
          partial: true,
        }) + '\n',
      );
    }
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

    const { todoWriteTool, todoReadTool } = createTodoTool({ context });
    const todoTools = context.config.todo ? [todoReadTool, todoWriteTool] : [];

    const mcpTools = context.mcpTools.map((tool) =>
      enhanceTool(tool, { category: 'network', riskLevel: 'medium' }),
    );

    const planTools = [...readonlyTools];
    const codeTools = [
      ...readonlyTools,
      ...writeTools,
      ...todoTools,
      ...mcpTools,
    ];
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

  public async compact() {
    const { summary, usage } = await generateSummaryMessage({
      history: this.history,
      model: this.modelId,
      language: this.context.config.language,
      modelProvider: this.opts.context.getModelProvider(),
    });

    debug('compacted usage', usage);
    this.lastUsage = new Usage(usage);

    this.history.length = 0;
    this.history.push({
      role: 'user',
      content: summary,
    });

    debug('compacted summary', summary);
    return {
      summary,
      usage,
    };
  }

  async #tryCompress() {
    if (this.history.length === 0) {
      return false;
    }

    let lastUsage = this.lastUsage;

    // 出现了异常导致 lastUsage 未被赋值, 使用 lastUsageResponse 代替
    if (
      lastUsage.totalTokens === 0 &&
      this.usage.lastUsageResponse &&
      this.usage.lastUsageResponse.totalTokens > 0
    ) {
      lastUsage = this.usage.lastUsageResponse;
      debug('lastUsage is not set, use lastUsageResponse');
    }

    // If the current used tokens have not exceeded 90% of the minimum available tokens, don't compress
    if (lastUsage.totalTokens <= MIN_TOKEN_THRESHOLD) {
      return false;
    }

    // If model information is not available, don't compress
    const model = await this.context.modelInfo.get(this.modelId);
    if (!model) {
      return false;
    }

    const outputLimit =
      Math.min(model.outputLimit, OUTPUT_TOKEN_MAX) || OUTPUT_TOKEN_MAX;
    const compressThreshold = Math.max(
      (model.contextLimit - outputLimit) * 0.9,
      0,
    );

    debug(
      `[compress] ${this.modelId}: outputLimit:${outputLimit} compressThreshold:${compressThreshold}`,
    );

    if (lastUsage.totalTokens > compressThreshold) {
      debug('compressing...');
      await this.compact();
      return true;
    }
    return false;
  }

  async run(opts: ServiceRunOpts): Promise<ServiceRunResult> {
    const stream = new Readable({
      read() {},
    });

    try {
      const compressed = await this.#tryCompress();
      if (compressed) {
        stream.emit(
          JSON.stringify({
            type: 'compressed',
            content: 'Token limit exceeded, content has been compressed',
          }),
        );
      }
    } catch (error) {
      debug('error #tryCompress', error);
      stream.emit('error', error);
      return { stream };
    }

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
    // Reset buffer at start of new stream
    this.textBuffer = '';

    // Reset last usage at start of new stream
    this.lastUsage.clear();

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
              this.textBuffer += textDelta;
              text += textDelta;

              // Check if the current text has incomplete XML tags
              if (this.hasIncompleteXmlTag(text)) {
                // Buffer the text and continue without parsing
                continue;
              }

              // If we have buffered content, process it
              if (this.textBuffer) {
                this.pushTextDelta(stream, this.textBuffer, text);
                this.textBuffer = '';
              } else {
                this.pushTextDelta(stream, textDelta, text);
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
            case 'finish':
              let usagePromptTokens = Number.isNaN(
                chunk.data.event.usage?.promptTokens,
              )
                ? 0
                : (chunk.data.event.usage?.promptTokens ?? 0);
              let usageCompletionTokens = Number.isNaN(
                chunk.data.event.usage?.completionTokens,
              )
                ? 0
                : (chunk.data.event.usage?.completionTokens ?? 0);

              this.lastUsage = new Usage({
                inputTokens: usagePromptTokens,
                outputTokens: usageCompletionTokens,
                totalTokens: usagePromptTokens + usageCompletionTokens,
                // 取 cache token 信息 后续用于 usage promptCacheHitTokens 等信息展示
                usageDetail: chunk.data.event?.providerMetadata?.[this.modelId],
              });
              break;
            default:
              break;
          }
        }
      }

      // Handle any remaining buffered content
      if (this.textBuffer) {
        this.pushTextDelta(stream, this.textBuffer, text);
        this.textBuffer = '';
      }

      const parsed = parseMessage(text);
      if (parsed[0]?.type === 'text') {
        stream.push(
          JSON.stringify({ type: 'text', content: parsed[0].content }) + '\n',
        );
      }

      if (this.lastUsage.inputTokens > 0) {
        this.usage.add(this.lastUsage);
      }

      // hook query
      await this.context.apply({
        hook: 'query',
        args: [
          {
            text,
            parsed,
            input,
            usage: this.lastUsage.toJSON(),
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
