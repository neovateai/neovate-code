import { PluginHookType } from '../plugin';
import { randomUUID } from '../utils/randomUUID';
import { Context } from './context';
import type { NormalizedMessage } from './history';
import { JsonlLogger } from './jsonl';
import { LlmsContext } from './llmsContext';
import { type ToolUse, runLoop } from './loop';
import { resolveModelWithContext } from './model';
import { OutputFormat } from './outputFormat';
import { OutputStyleManager } from './outputStyle';
import { generatePlanSystemPrompt } from './planSystemPrompt';
import { Session, SessionConfigManager, type SessionId } from './session';
import { generateSystemPrompt } from './systemPrompt';
import type { ApprovalCategory, Tool } from './tool';
import { Tools, resolveTools } from './tool';

export class Project {
  session: Session;
  context: Context;
  constructor(opts: { sessionId?: SessionId; context: Context }) {
    this.session = opts.sessionId
      ? Session.resume({
          id: opts.sessionId,
          logPath: opts.context.paths.getSessionLogPath(opts.sessionId),
        })
      : Session.create();
    this.context = opts.context;
  }

  async send(
    message: string | null,
    opts: {
      model?: string;
      onMessage?: (opts: { message: NormalizedMessage }) => Promise<void>;
      onToolApprove?: (opts: { toolUse: ToolUse }) => Promise<boolean>;
      signal?: AbortSignal;
    } = {},
  ) {
    let tools = await resolveTools({
      context: this.context,
      sessionId: this.session.id,
      write: true,
      todo: true,
    });
    tools = await this.context.apply({
      hook: 'tool',
      args: [],
      memo: tools,
      type: PluginHookType.SeriesMerge,
    });
    const outputStyleManager = await OutputStyleManager.create(this.context);
    const outputStyle = outputStyleManager.getOutputStyle(
      this.context.config.outputStyle,
    );
    const systemPrompt = generateSystemPrompt({
      todo: this.context.config.todo!,
      productName: this.context.productName,
      language: this.context.config.language,
      outputStyle,
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
      signal?: AbortSignal;
    } = {},
  ) {
    let tools = await resolveTools({
      context: this.context,
      sessionId: this.session.id,
      write: false,
      todo: false,
    });
    tools = await this.context.apply({
      hook: 'tool',
      args: [],
      memo: tools,
      type: PluginHookType.SeriesMerge,
    });
    const systemPrompt = generatePlanSystemPrompt({
      todo: this.context.config.todo!,
      productName: this.context.productName,
      language: this.context.config.language,
    });
    return this.sendWithSystemPromptAndTools(message, {
      ...opts,
      model: opts.model || this.context.config.planModel,
      tools,
      systemPrompt,
      onToolApprove: () => Promise.resolve(true),
    });
  }

  private async sendWithSystemPromptAndTools(
    message: string | null,
    opts: {
      model?: string;
      onMessage?: (opts: { message: NormalizedMessage }) => Promise<void>;
      onToolApprove?: (opts: {
        toolUse: ToolUse;
        category?: ApprovalCategory;
      }) => Promise<boolean>;
      signal?: AbortSignal;
      tools?: Tool[];
      systemPrompt?: string;
    } = {},
  ) {
    const tools = opts.tools || [];
    const outputFormat = new OutputFormat({
      format: this.context.config.outputFormat!,
      quiet: this.context.config.quiet,
    });
    const jsonlLogger = new JsonlLogger({
      filePath: this.context.paths.getSessionLogPath(this.session.id),
    });
    if (message !== null) {
      await this.context.apply({
        hook: 'userPrompt',
        args: [
          {
            text: message,
            sessionId: this.session.id,
          },
        ],
        type: PluginHookType.Series,
      });
    }
    const model = await resolveModelWithContext(
      opts.model || null,
      this.context,
    );
    const llmsContext = await LlmsContext.create({
      context: this.context,
    });
    if (message !== null) {
      outputFormat.onInit({
        text: message,
        sessionId: this.session.id,
        tools,
        model,
        cwd: this.context.cwd,
      });
    }
    let userMessage: NormalizedMessage | null = null;
    if (message !== null) {
      const lastMessageUuid =
        this.session.history.messages[this.session.history.messages.length - 1]
          ?.uuid;
      userMessage = {
        parentUuid: lastMessageUuid || null,
        uuid: randomUUID(),
        role: 'user',
        content: message,
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
    const input =
      this.session.history.messages.length > 0
        ? [...this.session.history.messages, userMessage]
        : [userMessage];
    const filteredInput = input.filter((message) => message !== null);
    const toolsManager = new Tools(tools);
    const result = await runLoop({
      input: filteredInput,
      model,
      tools: toolsManager,
      cwd: this.context.cwd,
      systemPrompt: opts.systemPrompt,
      llmsContexts: llmsContext.messages,
      signal: opts.signal,
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
      onTextDelta: async () => {},
      onText: async (text) => {
        await this.context.apply({
          hook: 'text',
          args: [
            {
              text,
              sessionId: this.session.id,
            },
          ],
          type: PluginHookType.Series,
        });
      },
      onReasoning: async (text) => {},
      onToolUse: async (toolUse) => {
        await this.context.apply({
          hook: 'toolUse',
          args: [
            {
              toolUse,
              sessionId: this.session.id,
            },
          ],
          type: PluginHookType.Series,
        });
      },
      onToolUseResult: async (toolUseResult) => {
        const { toolUse, result } = toolUseResult;
        await this.context.apply({
          hook: 'toolUseResult',
          args: [
            {
              toolUse,
              result,
              sessionId: this.session.id,
            },
          ],
          type: PluginHookType.Series,
        });
      },
      onTurn: async () => {},
      onToolApprove: async (toolUse) => {
        // TODO: if quiet return true
        // 1. if yolo return true
        const approvalMode = this.context.config.approvalMode;
        if (approvalMode === 'yolo') {
          return true;
        }
        // 2. if category is read return true
        const tool = toolsManager.get(toolUse.name);
        if (!tool) {
          throw new Error(`Tool ${toolUse.name} not found`);
        }
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
        const sessionConfigManager = new SessionConfigManager({
          logPath: this.context.paths.getSessionLogPath(this.session.id),
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
