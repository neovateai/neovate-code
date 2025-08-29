import { ConfigManager } from '../config';
import { CANCELED_MESSAGE_TEXT } from '../constants';
import { PluginHookType } from '../plugin';
import { randomUUID } from '../utils/randomUUID';
import { Context } from './context';
import type { Message, UserMessage } from './history';
import { JsonlLogger } from './jsonl';
import { MessageBus } from './messageBus';
import { resolveModelWithContext } from './model';
import { OutputStyleManager } from './outputStyle';
import { Project } from './project';
import { SlashCommandManager } from './slashCommand';

type NodeBridgeOpts = {
  contextCreateOpts: any;
};

export class NodeBridge {
  messageBus: MessageBus;
  private contextCreateOpts: any;
  constructor(opts: NodeBridgeOpts) {
    this.messageBus = new MessageBus();
    this.contextCreateOpts = opts.contextCreateOpts;
    new NodeHandlerRegistry(this.messageBus, this.contextCreateOpts);
  }
}

class NodeHandlerRegistry {
  private messageBus: MessageBus;
  private contextCreateOpts: any;
  private contexts = new Map<string, Context>();
  private abortControllers = new Map<string, AbortController>();
  constructor(messageBus: MessageBus, contextCreateOpts: any) {
    this.messageBus = messageBus;
    this.contextCreateOpts = contextCreateOpts;
    this.registerHandlers();
  }

  private async getContext(cwd: string) {
    if (this.contexts.has(cwd)) {
      return this.contexts.get(cwd)!;
    }
    const context = await Context.create({
      cwd,
      ...this.contextCreateOpts,
    });
    this.contexts.set(cwd, context);
    return context;
  }

  private registerHandlers() {
    this.messageBus.registerHandler(
      'initialize',
      async (data: { cwd: string }) => {
        const context = await this.getContext(data.cwd);
        const modelInfo = await resolveModelWithContext(null, context);
        const model = `${modelInfo.provider.id}/${modelInfo.model.id}`;
        const modelContextLimit = modelInfo.model.limit.context;
        return {
          success: true,
          data: {
            productName: context.productName,
            version: context.version,
            model,
            modelContextLimit,
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'send',
      async (data: {
        message: string | null;
        cwd: string;
        sessionId: string | undefined;
      }) => {
        const { message, cwd, sessionId } = data;
        const context = await this.getContext(cwd);
        const project = new Project({
          sessionId,
          context,
        });
        const abortController = new AbortController();
        const key = buildSignalKey(cwd, project.session.id);
        this.abortControllers.set(key, abortController);
        const result = await project.send(message, {
          onMessage: async (opts) => {
            await this.messageBus.emitEvent('message', {
              message: opts.message,
            });
          },
          signal: abortController.signal,
        });
        this.abortControllers.delete(key);
        return result;
      },
    );

    this.messageBus.registerHandler(
      'cancel',
      async (data: { cwd: string; sessionId: string }) => {
        const { cwd, sessionId } = data;
        const key = buildSignalKey(cwd, sessionId);
        const abortController = this.abortControllers.get(key);
        abortController?.abort();
        this.abortControllers.delete(key);
        const context = await this.getContext(cwd);
        const jsonlLogger = new JsonlLogger({
          filePath: context.paths.getSessionLogPath(sessionId),
        });
        await this.messageBus.emitEvent('message', {
          message: jsonlLogger.addUserMessage(CANCELED_MESSAGE_TEXT, sessionId),
        });
        return {
          success: true,
        };
      },
    );

    this.messageBus.registerHandler(
      'addMessages',
      async (data: { cwd: string; sessionId: string; messages: Message[] }) => {
        const { cwd, sessionId, messages } = data;
        const context = await this.getContext(cwd);
        const jsonlLogger = new JsonlLogger({
          filePath: context.paths.getSessionLogPath(sessionId),
        });
        for (const message of messages) {
          const normalizedMessage = {
            parentUuid: jsonlLogger.getLatestUuid(),
            uuid: randomUUID(),
            ...message,
            type: 'message' as const,
            timestamp: new Date().toISOString(),
            sessionId,
          };
          await this.messageBus.emitEvent('message', {
            message: jsonlLogger.addMessage({
              message: normalizedMessage,
            }),
          });
        }
        return {
          success: true,
        };
      },
    );

    //////////////////////////////////////////////
    // status
    this.messageBus.registerHandler(
      'getStatus',
      async (data: { cwd: string; sessionId: string }) => {
        const { cwd, sessionId } = data;
        const context = await this.getContext(cwd);
        const memo = {
          [`${context.productName}`]: {
            description: `v${context.version}`,
            items: [context.paths.getSessionLogPath(sessionId)],
          },
          'Working Directory': {
            items: [cwd],
          },
          Model: {
            items: [context.config.model],
          },
        };
        const status = await context.apply({
          hook: 'status',
          args: [],
          memo,
          type: PluginHookType.SeriesMerge,
        });
        return {
          success: true,
          data: {
            status,
          },
        };
      },
    );

    //////////////////////////////////////////////
    // config
    this.messageBus.registerHandler(
      'setConfig',
      async (data: {
        cwd: string;
        isGlobal: boolean;
        key: string;
        value: string;
      }) => {
        const { cwd, key, value, isGlobal } = data;
        const context = await this.getContext(cwd);
        const configManager = new ConfigManager(cwd, context.productName, {});
        configManager.setConfig(isGlobal, key, value);
        if (this.contexts.has(cwd)) {
          this.contexts.delete(cwd);
        }
        return {
          success: true,
        };
      },
    );

    //////////////////////////////////////////////
    // output style
    this.messageBus.registerHandler(
      'getOutputStyles',
      async (data: { cwd: string }) => {
        const { cwd } = data;
        const context = await this.getContext(cwd);
        const outputStyleManager = await OutputStyleManager.create(context);
        return {
          success: true,
          data: {
            outputStyles: outputStyleManager.outputStyles.map((style) => ({
              name: style.name,
              description: style.description,
            })),
            currentOutputStyle: context.config.outputStyle,
          },
        };
      },
    );

    //////////////////////////////////////////////
    // slash command

    this.messageBus.registerHandler(
      'getSlashCommands',
      async (data: { cwd: string }) => {
        const { cwd } = data;
        const context = await this.getContext(cwd);
        const slashCommandManager = await SlashCommandManager.create(context);
        return {
          success: true,
          data: {
            slashCommands: slashCommandManager.getAll(),
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'getSlashCommand',
      async (data: { cwd: string; command: string }) => {
        const { cwd, command } = data;
        const context = await this.getContext(cwd);
        const slashCommandManager = await SlashCommandManager.create(context);
        const commandEntry = slashCommandManager.get(command);
        return {
          success: true,
          data: {
            commandEntry,
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'executeSlashCommand',
      async (data: {
        cwd: string;
        sessionId: string;
        command: string;
        args: string;
      }) => {
        const { cwd, sessionId, command, args } = data;
        const context = await this.getContext(cwd);
        const slashCommandManager = await SlashCommandManager.create(context);
        const commandEntry = slashCommandManager.get(command);
        if (!commandEntry) {
          return {
            success: true,
            data: {
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: `Command ${command} not found` },
                  ],
                  history: null,
                },
              ],
            },
          };
        }
        const type = commandEntry.command.type;
        if (type === 'local') {
          const result = await commandEntry.command.call(args, context as any);
          return {
            success: true,
            data: {
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: result,
                    },
                  ],
                  history: null,
                },
              ],
            },
          };
        } else if (type === 'prompt') {
          const messages = (await commandEntry.command.getPromptForCommand(
            args,
          )) as Message[];
          for (const message of messages) {
            if (message.role === 'user') {
              (message as UserMessage).history = null;
              (message as UserMessage).hidden = true;
            }
            if (
              message.role === 'user' &&
              typeof message.content === 'string'
            ) {
              message.content = [
                {
                  type: 'text',
                  text: message.content,
                },
              ];
            }
          }
          return {
            success: true,
            data: {
              messages,
            },
          };
        } else {
          return {
            success: true,
            data: {
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `Unknown slash command type: ${type}`,
                    },
                  ],
                  history: null,
                },
              ],
            },
          };
        }
      },
    );
  }
}

function buildSignalKey(cwd: string, sessionId: string) {
  return `${cwd}/${sessionId}`;
}
