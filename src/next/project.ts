import { PluginHookType } from '../plugin';
import { Tools } from '../tool';
import { Context } from './context';
import type { UserMessage } from './history';
import { LlmsContext } from './llmsContext';
import { runLoop } from './loop';
import { modelAlias, providers, resolveModel } from './model';
import { OutputFormat } from './outputFormat';
import { Session, type SessionId } from './session';
import { generateSystemPrompt } from './systemPrompt';
import { resolveTools } from './tool';

export class Project {
  session: Session;
  context: Context;
  constructor(opts: { sessionId?: SessionId; context: Context }) {
    // TODO: resume session
    this.session = opts.sessionId
      ? new Session({
          id: opts.sessionId,
        })
      : Session.create();
    this.context = opts.context;
  }
  async send(message: string, opts: { model?: string } = {}) {
    const outputFormat = new OutputFormat({
      format: this.context.config.outputFormat!,
      quiet: this.context.config.quiet,
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
    const systemPrompt = generateSystemPrompt({
      todo: false,
      productName: this.context.productName,
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
    const userMessage: UserMessage = {
      role: 'user',
      content: message,
    };
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
        outputFormat.onText({
          text,
          sessionId: this.session.id,
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
        outputFormat.onToolUse({
          toolUse,
          sessionId: this.session.id,
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
        outputFormat.onToolUseResult({
          toolUse,
          result,
          sessionId: this.session.id,
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
    // update history to session
    if (result.success && result.data.history) {
      this.session.updateHistory(result.data.history);
    }
    return result;
  }
}
