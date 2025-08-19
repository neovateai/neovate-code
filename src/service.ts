import { Agent, type AgentInputItem, Runner } from '@openai/agents';
import createDebug from 'debug';
import { Readable } from 'stream';
import { createCodeAgent } from './agents/code';
import { createPlanAgent } from './agents/plan';
import { MIN_TOKEN_THRESHOLD } from './constants';
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
  model?: string;
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
  private textBuffer: string = '';
  private usage: Usage;
  private lastUsage: Usage;
  private modelId: string;
  private baseTools: Tools;
  private lastMcpToolsCount: number = 0;

  constructor(opts: ServiceOpts) {
    this.opts = opts;
    this.id = opts.id || randomUUID();
    this.context = opts.context;
    this.baseTools = opts.tools;
    this.tools = opts.tools;
    this.modelId =
      this.opts.agentType === 'code'
        ? this.context.config.model
        : this.context.config.planModel;
    this.usage = new Usage();
    this.lastUsage = new Usage();
    this.setupAgent();
  }

  setupAgent() {
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

  private async updateMcpTools(): Promise<boolean> {
    // Only update for code agents that can use MCP tools
    if (this.opts.agentType !== 'code') {
      return false;
    }

    const availableMcpTools = this.context.mcpManager.getAvailableTools();

    // Check if tools have changed
    if (availableMcpTools.length === this.lastMcpToolsCount) {
      return false; // No change
    }

    debug('Updating MCP tools:', {
      previous: this.lastMcpToolsCount,
      current: availableMcpTools.length,
    });

    // Mark MCP tools with a specific identifier for future filtering
    const enhancedMcpTools = availableMcpTools.map((tool) => ({
      ...enhanceTool(tool, {
        category: 'network',
        riskLevel: 'medium',
      }),
      // Add explicit MCP marker for reliable identification
      __isMcpTool: true as const,
    }));

    // Get base tools as array from the Tools instance
    const baseToolsArray = Object.values(this.baseTools.tools);

    // Filter out previously added MCP tools using the explicit marker
    const nonMcpBaseTools = baseToolsArray.filter((tool) => {
      return !tool.__isMcpTool;
    });

    // Rebuild complete tool set
    const allTools = [...nonMcpBaseTools, ...enhancedMcpTools];
    this.tools = new Tools(allTools);
    this.lastMcpToolsCount = availableMcpTools.length;

    // Recreate agent with new tools
    this.setupAgent();

    return true; // Tools were updated
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

    // Get currently available MCP tools (non-blocking)
    const mcpTools = context.mcpManager
      .getAvailableTools()
      .map((tool) =>
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

  public clear() {
    this.history.length = 0;
    this.lastUsage.clear();
  }

  async #tryCompress() {
    if (!this.context.config.autoCompact) {
      debug("autoCompact is disabled, don't compress");
      return false;
    }

    if (this.history.length === 0) {
      return false;
    }

    let lastUsage = this.lastUsage;

    // If there is an exception causing lastUsage to not be set, use lastUsageResponse instead
    if (
      lastUsage.totalTokens === 0 &&
      this.usage.lastUsageResponse &&
      this.usage.lastUsageResponse.totalTokens > 0
    ) {
      lastUsage = this.usage.lastUsageResponse;
      debug('lastUsage is not set, use lastUsageResponse');
    }

    // If the current token usage is less than the minimum model token compression threshold, don't compress
    if (lastUsage.totalTokens < MIN_TOKEN_THRESHOLD) {
      debug("lastUsage.totalTokens < MIN_TOKEN_THRESHOLD, don't compress");
      return false;
    }

    // If model information is not available, don't compress
    const model = await this.context.modelInfo.get(this.modelId);
    if (!model) {
      debug(`model ${this.modelId} is not available, don't compress`);
      return false;
    }

    const compressThreshold =
      this.context.modelInfo.getCompressThreshold(model);

    debug(
      `[compress] ${this.modelId} compressThreshold:${compressThreshold} lastUsage:${lastUsage.totalTokens}`,
    );

    if (lastUsage.totalTokens >= compressThreshold) {
      debug('compressing...');
      // TODO: Currently using direct compression. Future improvements could
      // - Dynamic compression ratios (2:1 or 4:1)
      // - Merging duplicate file reads
      await this.compact();
      return true;
    }
    return false;
  }

  async run(opts: ServiceRunOpts): Promise<ServiceRunResult> {
    const prompt =
      opts.input.length && typeof (opts.input[0] as any).content === 'string'
        ? (opts.input[0] as any).content
        : undefined;
    if (prompt) {
      await this.context.apply({
        hook: 'userPrompt',
        args: [
          {
            text: prompt,
          },
        ],
        type: PluginHookType.Series,
      });
    }

    // Wait for MCP initialization to complete before updating tools
    if (this.context.mcpManager.isLoading()) {
      await this.context.mcpManager.initAsync();
    }

    // Update MCP tools if available
    await this.updateMcpTools();

    const stream = new Readable({
      read() {},
    });

    // Reset modelId, compression will consume it
    if (opts.model) {
      this.modelId = opts.model;
    }

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
      let systemPromptStrs = await this.context.buildSystemPrompts();
      systemPromptStrs = await this.context.apply({
        hook: 'systemPrompt',
        args: [
          {
            prompt,
          },
        ],
        memo: systemPromptStrs,
        type: PluginHookType.SeriesMerge,
      });
      const systemPrompts = systemPromptStrs.map((str) => ({
        role: 'system' as const,
        content: str,
      }));
      const prevInput =
        this.history.filter((item) => (item as any).role !== 'system') || [];
      return [...systemPrompts, ...prevInput, ...opts.input];
    })();

    this.#processStream(
      input,
      stream,
      opts.thinking,
      opts.model,
      opts.abortSignal,
    ).catch((error) => {
      stream.emit('error', error);
    });
    return { stream };
  }

  async #processStream(
    input: AgentInputItem[],
    stream: Readable,
    thinking?: boolean,
    model?: string,
    abortSignal?: AbortSignal,
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

      let agent = this.agent;
      // model will always be passed, only clone if it's different
      if (model && model !== this.agent?.model) {
        debug('run custom model', model);
        agent = this.agent!.clone({
          model,
        });
      }

      const result = await runner.run(agent!, input, {
        stream: true,
        ...(abortSignal && { signal: abortSignal }),
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

      // only accept one tool use per message
      const parts = text.split('</use_tool>');
      if (parts.length > 2 && result.history.length > 0) {
        const lastEntry = result.history[result.history.length - 1];
        if (
          lastEntry.type === 'message' &&
          lastEntry.content &&
          lastEntry.content[0]
        ) {
          text = parts[0] + '</use_tool>';
          (lastEntry.content[0] as any).text = text;
        }
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

      const history: AgentInputItem[] = result.history;
      const toolUse = parsed.find((item) => item.type === 'tool_use');
      if (toolUse) {
        const callId = randomUUID();
        toolUse.callId = callId;
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

      // hook query
      await this.context.apply({
        hook: 'query',
        args: [
          {
            text,
            parsed,
            input,
            usage: this.lastUsage.toJSON(),
            model: this.modelId,
          },
        ],
        type: PluginHookType.Series,
      });
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
    let result = await this.tools!.invoke(
      name,
      JSON.stringify(params),
      this.context,
    );
    result = await this.context.apply({
      hook: 'toolUseResult',
      args: [
        {
          callId,
          name,
          params,
        },
      ],
      memo: result,
      type: PluginHookType.SeriesLast,
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

  public getUsage() {
    return this.usage;
  }
}
