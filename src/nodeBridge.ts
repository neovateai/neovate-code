import { compact } from './compact';
import { type ApprovalMode, ConfigManager } from './config';
import { CANCELED_MESSAGE_TEXT } from './constants';
import { Context } from './context';
import type { Message, NormalizedMessage, UserMessage } from './history';
import { JsonlLogger } from './jsonl';
import { MessageBus } from './messageBus';
import {
  type Model,
  type Provider,
  providers,
  resolveModelWithContext,
} from './model';
import { OutputStyleManager } from './outputStyle';
import { PluginHookType } from './plugin';
import { Project } from './project';
import { query } from './query';
import { SessionConfigManager } from './session';
import { SlashCommandManager } from './slashCommand';
import { listDirectory } from './utils/list';
import { randomUUID } from './utils/randomUUID';

type ModelData = Omit<Model, 'id' | 'cost'>;

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

  private async clearContext(cwd?: string) {
    if (cwd) {
      this.contexts.delete(cwd);
    } else {
      this.contexts.clear();
    }
  }

  private registerHandlers() {
    this.messageBus.registerHandler(
      'initialize',
      async (data: { cwd: string; sessionId?: string }) => {
        const context = await this.getContext(data.cwd);
        const modelInfo = await resolveModelWithContext(null, context);
        const model = `${modelInfo.provider.id}/${modelInfo.model.id}`;
        const modelContextLimit = modelInfo.model.limit.context;

        // Get session config if sessionId is provided
        let sessionSummary: string | undefined;
        if (data.sessionId) {
          try {
            const sessionConfigManager = new SessionConfigManager({
              logPath: context.paths.getSessionLogPath(data.sessionId),
            });
            sessionSummary = sessionConfigManager.config.summary;
          } catch (error) {
            // Silently ignore if session config not available
          }
        }

        return {
          success: true,
          data: {
            productName: context.productName,
            productASCIIArt: context.productASCIIArt,
            version: context.version,
            model,
            modelContextLimit,
            approvalMode: context.config.approvalMode,
            sessionSummary,
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
        planMode: boolean;
        model?: string;
      }) => {
        const { message, cwd, sessionId, model } = data;
        const context = await this.getContext(cwd);
        const project = new Project({
          sessionId,
          context,
        });
        const abortController = new AbortController();
        const key = buildSignalKey(cwd, project.session.id);
        this.abortControllers.set(key, abortController);
        const fn = data.planMode ? project.plan : project.send;
        const result = await fn.call(project, message, {
          model,
          onMessage: async (opts) => {
            await this.messageBus.emitEvent('message', {
              message: opts.message,
            });
          },
          onToolApprove: async ({ toolUse, category }: any) => {
            const result = await this.messageBus.request('toolApproval', {
              toolUse,
              category,
            });
            return result.approved;
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
            // @ts-ignore
            parentUuid: message.parentUuid ?? jsonlLogger.getLatestUuid(),
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
    // sessions
    this.messageBus.registerHandler(
      'getAllSessions',
      async (data: { cwd: string }) => {
        const { cwd } = data;
        const context = await this.getContext(cwd);
        const sessions = context.paths.getAllSessions();
        return {
          success: true,
          data: {
            sessions,
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'resumeSession',
      async (data: { cwd: string; sessionId: string }) => {
        const { cwd, sessionId } = data;
        const context = await this.getContext(cwd);
        return {
          success: true,
          data: {
            sessionId,
            logFile: context.paths.getSessionLogPath(sessionId),
          },
        };
      },
    );

    // models
    this.messageBus.registerHandler(
      'getModels',
      async (data: { cwd: string }) => {
        const { cwd } = data;
        const context = await this.getContext(cwd);
        const hookedProviders = await context.apply({
          hook: 'provider',
          args: [],
          memo: providers,
          type: PluginHookType.SeriesLast,
        });
        const currentModelInfo = await resolveModelWithContext(null, context);
        const currentModel = `${currentModelInfo.provider.id}/${currentModelInfo.model.id}`;

        const groupedModels = Object.values(
          hookedProviders as Record<string, Provider>,
        ).map((provider) => ({
          provider: provider.name,
          providerId: provider.id,
          models: Object.entries(provider.models).map(([modelId, model]) => ({
            name: (model as ModelData).name,
            modelId: modelId,
            value: `${provider.id}/${modelId}`,
          })),
        }));

        return {
          success: true,
          data: {
            groupedModels,
            currentModel,
            currentModelInfo: {
              providerName: currentModelInfo.provider.name,
              modelName: currentModelInfo.model.name,
              modelId: currentModelInfo.model.id,
            },
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
                },
              ],
            },
          };
        }
      },
    );

    //////////////////////////////////////////////
    // utils

    this.messageBus.registerHandler(
      'query',
      async (data: {
        userPrompt: string;
        cwd: string;
        systemPrompt?: string;
      }) => {
        const { userPrompt, cwd, systemPrompt } = data;
        const context = await this.getContext(cwd);
        const result = await query({
          userPrompt,
          context,
          systemPrompt,
        });
        return result;
      },
    );

    this.messageBus.registerHandler(
      'getPaths',
      async (data: { cwd: string; maxFiles?: number }) => {
        const { cwd, maxFiles = 6000 } = data;
        const context = await this.getContext(cwd);
        const result = listDirectory(
          context.cwd,
          context.cwd,
          context.productName,
          maxFiles,
        );
        return {
          success: true,
          data: {
            paths: result,
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'compact',
      async (data: {
        cwd: string;
        sessionId: string;
        messages: NormalizedMessage[];
      }) => {
        const { cwd, messages } = data;
        const context = await this.getContext(cwd);
        const modelInfo = await resolveModelWithContext(null, context);
        const summary = await compact({
          messages,
          model: modelInfo,
        });
        return {
          success: true,
          data: {
            summary,
          },
        };
      },
    );

    //////////////////////////////////////////////
    // session config
    this.messageBus.registerHandler(
      'sessionConfig.setApprovalMode',
      async (data: {
        cwd: string;
        sessionId: string;
        approvalMode: ApprovalMode;
      }) => {
        const { cwd, sessionId, approvalMode } = data;
        const context = await this.getContext(cwd);
        const sessionConfigManager = new SessionConfigManager({
          logPath: context.paths.getSessionLogPath(sessionId),
        });
        sessionConfigManager.config.approvalMode = approvalMode;
        sessionConfigManager.write();
        return {
          success: true,
        };
      },
    );
    this.messageBus.registerHandler(
      'sessionConfig.addApprovalTools',
      async (data: {
        cwd: string;
        sessionId: string;
        approvalTool: string;
      }) => {
        const { cwd, sessionId, approvalTool } = data;
        const context = await this.getContext(cwd);
        const sessionConfigManager = new SessionConfigManager({
          logPath: context.paths.getSessionLogPath(sessionId),
        });
        if (!sessionConfigManager.config.approvalTools.includes(approvalTool)) {
          sessionConfigManager.config.approvalTools.push(approvalTool);
          sessionConfigManager.write();
        }
        return {
          success: true,
        };
      },
    );
    this.messageBus.registerHandler(
      'sessionConfig.addHistory',
      async (data: { cwd: string; sessionId: string; history: string }) => {
        const { cwd, sessionId, history } = data;
        const context = await this.getContext(cwd);
        const sessionConfigManager = new SessionConfigManager({
          logPath: context.paths.getSessionLogPath(sessionId),
        });
        sessionConfigManager.config.history.push(history);
        sessionConfigManager.write();
        return {
          success: true,
        };
      },
    );
    this.messageBus.registerHandler(
      'sessionConfig.setSummary',
      async (data: { cwd: string; sessionId: string; summary: string }) => {
        const { cwd, sessionId, summary } = data;
        const context = await this.getContext(cwd);
        const sessionConfigManager = new SessionConfigManager({
          logPath: context.paths.getSessionLogPath(sessionId),
        });
        sessionConfigManager.config.summary = summary;
        sessionConfigManager.write();
        return {
          success: true,
        };
      },
    );

    this.messageBus.registerHandler(
      'clearContext',
      async (data: { cwd?: string }) => {
        await this.clearContext(data.cwd);
        return {
          success: true,
        };
      },
    );
  }
}

function buildSignalKey(cwd: string, sessionId: string) {
  return `${cwd}/${sessionId}`;
}
