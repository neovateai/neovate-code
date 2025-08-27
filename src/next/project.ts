import { PluginHookType } from '../plugin';
import { Tools } from '../tool';
import { randomUUID } from '../utils/randomUUID';
import { Context } from './context';
import type { NormalizedMessage } from './history';
import { JsonlLogger } from './jsonl';
import { LlmsContext } from './llmsContext';
import { runLoop } from './loop';
import { modelAlias, providers, resolveModel } from './model';
import { OutputFormat } from './outputFormat';
import { OutputStyleManager } from './outputStyle';
import { Session, type SessionId } from './session';
import { generateSystemPrompt } from './systemPrompt';
import { resolveTools } from './tool';

export class Project {
  session: Session;
  context: Context;
  constructor(opts: { sessionId?: SessionId; context: Context }) {
    // TODO: resume session
    this.session = opts.sessionId
      ? Session.resume({
          id: opts.sessionId,
          logPath: opts.context.paths.getSessionLogPath(opts.sessionId),
        })
      : Session.create();
    this.context = opts.context;
  }
  async send(
    message: string,
    opts: {
      model?: string;
      onMessage?: (opts: { message: NormalizedMessage }) => Promise<void>;
    } = {},
  ) {
    const outputFormat = new OutputFormat({
      format: this.context.config.outputFormat!,
      quiet: this.context.config.quiet,
    });
    const jsonlLogger = new JsonlLogger({
      filePath: this.context.paths.getSessionLogPath(this.session.id),
    });
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
    const hookedProviders = await this.context.apply({
      hook: 'provider',
      args: [],
      memo: providers,
      type: PluginHookType.SeriesLast,
    });
    const hookedModelAlias = await this.context.apply({
      hook: 'modelAlias',
      args: [],
      memo: modelAlias,
      type: PluginHookType.SeriesLast,
    });
    const model = resolveModel(
      opts.model || this.context.config.model,
      hookedProviders,
      hookedModelAlias,
    );
    let tools = await resolveTools({
      context: this.context,
    });
    tools = await this.context.apply({
      hook: 'tool',
      args: [],
      memo: tools,
      type: PluginHookType.SeriesMerge,
    });
    const pluginOutputStyles = await this.context.apply({
      hook: 'outputStyle',
      args: [],
      memo: [],
      type: PluginHookType.SeriesMerge,
    });
    const outputStyle = new OutputStyleManager({
      paths: this.context.paths,
      outputStyles: pluginOutputStyles,
    }).getOutputStyle(this.context.config.outputStyle);
    const systemPrompt = generateSystemPrompt({
      todo: this.context.config.todo!,
      productName: this.context.productName,
      language: this.context.config.language,
      outputStyle,
    });
    const llmsContext = await LlmsContext.create({
      context: this.context,
      userPrompt: message,
    });
    outputFormat.onInit({
      text: message,
      sessionId: this.session.id,
      tools,
      model,
      cwd: this.context.cwd,
    });
    const userMessage: NormalizedMessage = {
      role: 'user',
      content: message,
      type: 'message',
      timestamp: new Date().toISOString(),
      uuid: randomUUID(),
      parentUuid: null,
    };
    jsonlLogger.onMessage({
      message: userMessage,
    });

    await opts.onMessage?.({
      message: userMessage,
    });

    const input =
      this.session.history.messages.length > 0
        ? [...this.session.history.messages, userMessage]
        : [userMessage];
    // TODO: signal
    const result = await runLoop({
      input,
      model,
      tools: new Tools(tools),
      cwd: this.context.cwd,
      systemPrompt,
      llmsContexts: llmsContext.messages,
      autoCompact: this.context.config.autoCompact,
      onMessage: async (message) => {
        const normalizedMessage = {
          ...message,
          sessionId: this.session.id,
        };
        outputFormat.onMessage({
          message: normalizedMessage,
        });
        jsonlLogger.onMessage({
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
      onReasoning: async (text) => console.log(text),
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
      onToolApprove: async () => {
        return true;
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
