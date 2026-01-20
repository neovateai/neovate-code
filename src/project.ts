import { TOOL_NAMES } from './constants';
import type { Context } from './context';
import { JsonlLogger, RequestLogger } from './jsonl';
import { LlmsContext } from './llmsContext';
import { runLoop, type StreamResult, type ThinkingConfig } from './loop';
import type { ImagePart, NormalizedMessage, UserContent } from './message';
import { resolveModelWithContext } from './model';
import { OutputFormat } from './outputFormat';
import { OutputStyleManager } from './outputStyle';
import { generatePlanSystemPrompt } from './planSystemPrompt';
import { PluginHookType } from './plugin';
import { Session, SessionConfigManager, type SessionId } from './session';
import { generateSystemPrompt } from './systemPrompt';
import type {
  ApprovalCategory,
  Tool,
  ToolApprovalResult,
  ToolUse,
} from './tool';
import { resolveTools, Tools } from './tool';
import { Usage } from './usage';
import { randomUUID } from './utils/randomUUID';

export class Project {
  session: Session;
  context: Context;
  // For subagent to inherit parent session config
  parentSessionId?: string;
  constructor(opts: {
    sessionId?: SessionId;
    parentSessionId?: string;
    context: Context;
  }) {
    this.session = opts.sessionId
      ? Session.resume({
          id: opts.sessionId,
          logPath: opts.context.paths.getSessionLogPath(opts.sessionId),
        })
      : Session.create();
    this.context = opts.context;
    this.parentSessionId = opts.parentSessionId;
  }

  async send(
    message: string | null,
    opts: {
      model?: string;
      onMessage?: (opts: { message: NormalizedMessage }) => Promise<void>;
      onToolApprove?: (opts: {
        toolUse: ToolUse;
      }) => Promise<boolean | ToolApprovalResult>;
      onTextDelta?: (text: string) => Promise<void>;
      onChunk?: (chunk: any, requestId: string) => Promise<void>;
      onStreamResult?: (result: StreamResult) => Promise<void>;
      signal?: AbortSignal;
      attachments?: ImagePart[];
      parentUuid?: string;
      thinking?: ThinkingConfig;
    } = {},
  ) {
    const tools = await resolveTools({
      context: this.context,
      sessionId: this.session.id,
      write: true,
      todo: true,
      askUserQuestion: !this.context.config.quiet,
      signal: opts.signal,
      task: true,
      isPlan: false,
    });
    const outputStyleManager = await OutputStyleManager.create(this.context);
    const outputStyle = outputStyleManager.getOutputStyle(
      this.context.config.outputStyle,
      this.context.cwd,
    );
    const hasTaskTool = tools.some((t) => t.name === TOOL_NAMES.TASK);
    let systemPrompt = generateSystemPrompt({
      todo: this.context.config.todo!,
      productName: this.context.productName,
      language: this.context.config.language,
      outputStyle,
      task: hasTaskTool,
    });
    systemPrompt = await this.context.apply({
      hook: 'systemPrompt',
      args: [{ sessionId: this.session.id }],
      memo: systemPrompt,
      type: PluginHookType.SeriesLast,
    });
    return this.sendWithSystemPromptAndTools(message, {
      ...opts,
      tools,
      systemPrompt,
    });
  }

  async plan(
    message: string | null,
    opts: {
      model?: string;
      onMessage?: (opts: { message: NormalizedMessage }) => Promise<void>;
      onTextDelta?: (text: string) => Promise<void>;
      onChunk?: (chunk: any, requestId: string) => Promise<void>;
      onStreamResult?: (result: StreamResult) => Promise<void>;
      signal?: AbortSignal;
      attachments?: ImagePart[];
      parentUuid?: string;
      thinking?: ThinkingConfig;
    } = {},
  ) {
    const tools = await resolveTools({
      context: this.context,
      sessionId: this.session.id,
      write: false,
      todo: false,
      askUserQuestion: !this.context.config.quiet,
      signal: opts.signal,
      task: false,
      isPlan: true,
    });
    let systemPrompt = generatePlanSystemPrompt({
      todo: this.context.config.todo!,
      productName: this.context.productName,
      language: this.context.config.language,
    });
    systemPrompt = await this.context.apply({
      hook: 'systemPrompt',
      args: [{ isPlan: true, sessionId: this.session.id }],
      memo: systemPrompt,
      type: PluginHookType.SeriesLast,
    });
    return this.sendWithSystemPromptAndTools(message, {
      ...opts,
      model: opts.model || this.context.config.planModel,
      tools,
      systemPrompt,
      // why? askUserQuestion tool will always require user input, so we don't need to approve it
      // onToolApprove: () => Promise.resolve(true),
    });
  }

  async sendWithSystemPromptAndTools(
    message: string | null,
    opts: {
      model?: string;
      onMessage?: (opts: { message: NormalizedMessage }) => Promise<void>;
      onToolApprove?: (opts: {
        toolUse: ToolUse;
        category?: ApprovalCategory;
      }) => Promise<boolean | ToolApprovalResult>;
      onTextDelta?: (text: string) => Promise<void>;
      onChunk?: (chunk: any, requestId: string) => Promise<void>;
      onStreamResult?: (result: StreamResult) => Promise<void>;
      signal?: AbortSignal;
      tools?: Tool[];
      systemPrompt?: string;
      attachments?: ImagePart[];
      parentUuid?: string;
      thinking?: ThinkingConfig;
      skipStopHook?: boolean;
    } = {},
  ) {
    const startTime = new Date();
    const tools = opts.tools || [];
    const outputFormat = new OutputFormat({
      format: this.context.config.outputFormat!,
      quiet: this.context.config.quiet,
    });

    const jsonlLogger = new JsonlLogger({
      filePath: this.context.paths.getSessionLogPath(this.session.id),
    });
    const requestLogger = new RequestLogger({
      globalProjectDir: this.context.paths.globalProjectDir,
    });
    if (message !== null) {
      message = await this.context.apply({
        hook: 'userPrompt',
        memo: message,
        args: [
          {
            sessionId: this.session.id,
          },
        ],
        type: PluginHookType.SeriesLast,
      });
    }
    const sessionConfigManager = new SessionConfigManager({
      logPath: this.context.paths.getSessionLogPath(this.session.id),
    });
    const additionalDirectories =
      sessionConfigManager.config.additionalDirectories || [];

    const llmsContext = await LlmsContext.create({
      context: this.context,
      sessionId: this.session.id,
      userPrompt: message,
      additionalDirectories,
    });
    let userMessage: NormalizedMessage | null = null;
    if (message !== null) {
      const lastMessageUuid =
        opts.parentUuid ||
        this.session.history.messages[this.session.history.messages.length - 1]
          ?.uuid;

      let content: UserContent = message;
      if (opts.attachments?.length) {
        content = [
          {
            type: 'text' as const,
            text: message,
          },
          ...opts.attachments,
        ];
      }

      userMessage = {
        parentUuid: lastMessageUuid || null,
        uuid: randomUUID(),
        role: 'user',
        content,
        type: 'message',
        timestamp: new Date().toISOString(),
      };
      const userMessageWithSessionId = {
        ...userMessage,
        sessionId: this.session.id,
      };
      jsonlLogger.addMessage({
        message: userMessageWithSessionId,
      });
      await opts.onMessage?.({
        message: userMessage,
      });
    }
    const historyMessages = opts.parentUuid
      ? this.session.history.getMessagesToUuid(opts.parentUuid)
      : this.session.history.messages;
    const input =
      historyMessages.length > 0
        ? [...historyMessages, userMessage]
        : [userMessage];
    const filteredInput = input.filter((message) => message !== null);

    // Check if conversation history contains any images
    const hasImagesInHistory = filteredInput.some((msg) => {
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        return msg.content.some((part: any) => part.type === 'image');
      }
      return false;
    });

    // Model selection priority (high to low):
    // 1. opts.model - explicitly specified for this call
    // 2. visionModel - if images present and visionModel is configured
    // 3. default model - resolved from context
    let modelToUse = opts.model;

    // Auto-select visionModel when:
    // - Conversation contains images
    // - visionModel is configured and different from the base model
    if (hasImagesInHistory) {
      const visionModel = this.context.config.visionModel;
      const baseModel = this.context.config.model;

      // Check if visionModel was explicitly configured (not just a fallback)
      // by comparing against what the base model would be
      if (visionModel && visionModel !== baseModel) {
        modelToUse = visionModel;
      }
    }

    // Resolve the final model (only once)
    const resolvedModel = (
      await resolveModelWithContext(modelToUse || null, this.context)
    ).model!;

    // Output model info for initial message
    if (message !== null) {
      outputFormat.onInit({
        text: message,
        sessionId: this.session.id,
        tools,
        model: resolvedModel,
        cwd: this.context.cwd,
      });
    }

    const toolsManager = new Tools(tools);
    const result = await runLoop({
      input: filteredInput,
      model: resolvedModel,
      tools: toolsManager,
      cwd: this.context.cwd,
      systemPrompt: opts.systemPrompt,
      llmsContexts: llmsContext.messages,
      signal: opts.signal,
      autoCompact: this.context.config.autoCompact,
      thinking: opts.thinking,
      temperature: this.context.config.temperature,
      onMessage: async (message) => {
        const normalizedMessage = {
          ...message,
          sessionId: this.session.id,
        };
        outputFormat.onMessage({
          message: normalizedMessage,
        });
        jsonlLogger.addMessage({
          message: normalizedMessage,
        });
        await opts.onMessage?.({
          message: normalizedMessage,
        });
      },
      onTextDelta: async (text) => {
        await opts.onTextDelta?.(text);
      },
      onStreamResult: async (result) => {
        requestLogger.logMetadata({
          requestId: result.requestId,
          prompt: result.prompt,
          model: result.model,
          tools: result.tools,
          request: result.request,
          response: result.response,
          error: result.error,
        });
        await opts.onStreamResult?.(result);
      },
      onChunk: async (chunk, requestId) => {
        requestLogger.logChunk(requestId, chunk);
        await opts.onChunk?.(chunk, requestId);
      },
      onText: async (text) => {},
      onReasoning: async (text) => {},
      onToolUse: async (toolUse) => {
        return await this.context.apply({
          hook: 'toolUse',
          args: [
            {
              sessionId: this.session.id,
            },
          ],
          memo: toolUse,
          type: PluginHookType.SeriesLast,
        });
      },
      onToolResult: async (toolUse, toolResult, approved) => {
        return await this.context.apply({
          hook: 'toolResult',
          args: [
            {
              toolUse,
              approved,
              sessionId: this.session.id,
            },
          ],
          memo: toolResult,
          type: PluginHookType.SeriesLast,
        });
      },
      onTurn: async (turn: {
        usage: Usage;
        startTime: Date;
        endTime: Date;
      }) => {
        await this.context.apply({
          hook: 'query',
          args: [
            {
              startTime: turn.startTime,
              endTime: turn.endTime,
              usage: turn.usage,
              sessionId: this.session.id,
            },
          ],
          type: PluginHookType.Series,
        });
      },
      onToolApprove: async (toolUse) => {
        const tool = toolsManager.get(toolUse.name);
        if (!tool) {
          // Let the tool invoke handle the `tool not found` error
          return true;
        }

        // TODO: if quiet return true
        // 1. if yolo return true
        const approvalMode = this.context.config.approvalMode;
        // Tools that require clarifying user input must always prompt the user, even in yolo mode
        if (approvalMode === 'yolo' && tool.approval?.category !== 'ask') {
          return true;
        }

        // 2. if category is read return true
        if (tool.approval?.category === 'read') {
          return true;
        }
        // 3. run tool should approve if true return true
        const needsApproval = tool.approval?.needsApproval;
        if (needsApproval) {
          const needsApprovalResult = await needsApproval({
            toolName: toolUse.name,
            params: toolUse.params,
            approvalMode: this.context.config.approvalMode,
            context: this.context,
          });
          if (!needsApprovalResult) {
            return true;
          }
        }
        // 4. if category is edit check autoEdit config (including session config)
        // Read parent session config first, so subagent can inherit parent agent's approval settings
        // If there is no parent (independent agent), use its own session
        const sessionIdToCheck = this.parentSessionId || this.session.id;
        const sessionConfigManager = new SessionConfigManager({
          logPath: this.context.paths.getSessionLogPath(sessionIdToCheck),
        });
        if (tool.approval?.category === 'write') {
          if (
            sessionConfigManager.config.approvalMode === 'autoEdit' ||
            approvalMode === 'autoEdit'
          ) {
            return true;
          }
        }
        // 5. check session config's approvalTools config
        if (sessionConfigManager.config.approvalTools.includes(toolUse.name)) {
          return true;
        }
        // 6. request user approval
        return (
          (await opts.onToolApprove?.({
            toolUse,
            category: tool.approval?.category,
          })) ?? false
        );
      },
    });
    const endTime = new Date();
    await this.context.apply({
      hook: 'conversation',
      args: [
        {
          userPrompt: message,
          result,
          startTime,
          endTime,
          sessionId: this.session.id,
        },
      ],
      type: PluginHookType.Series,
    });
    if (!opts.skipStopHook) {
      await this.context.apply({
        hook: 'stop',
        args: [
          {
            sessionId: this.session.id,
            result,
            usage: result.success ? result.data.usage : Usage.empty(),
            turnsCount: result.success ? result.metadata.turnsCount : 0,
            toolCallsCount: result.success ? result.metadata.toolCallsCount : 0,
            duration: result.success ? result.metadata.duration : 0,
            model: `${resolvedModel.provider.id}/${resolvedModel.model.id}`,
          },
        ],
        type: PluginHookType.Series,
      });
    }
    outputFormat.onEnd({
      result,
      sessionId: this.session.id,
    });
    if (result.success && result.data.history) {
      this.session.updateHistory(result.data.history);
    }

    return result;
  }
}
