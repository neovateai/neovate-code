import { compact } from './compact';
import {
  type ApprovalMode,
  type Config,
  ConfigManager,
  type McpServerConfig,
} from './config';
import { CANCELED_MESSAGE_TEXT } from './constants';
import { Context } from './context';
import { JsonlLogger } from './jsonl';
import type { StreamResult } from './loop';
import type {
  ImagePart,
  Message,
  NormalizedMessage,
  UserMessage,
} from './message';
import { MessageBus } from './messageBus';
import {
  type Model,
  type Provider,
  type ProvidersMap,
  resolveModelWithContext,
} from './model';
import { OutputStyleManager } from './outputStyle';
import { PluginHookType } from './plugin';
import { Project } from './project';
import { query } from './query';
import { SessionConfigManager } from './session';
import { SlashCommandManager } from './slashCommand';
import { getFiles } from './utils/files';
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
    // init mcp manager but don't wait for it
    context.mcpManager.initAsync();
    this.contexts.set(cwd, context);
    return context;
  }

  private async clearContext(cwd?: string) {
    if (cwd) {
      const context = await this.getContext(cwd);
      await context.destroy();
      this.contexts.delete(cwd);
    } else {
      this.contexts.clear();
    }
  }

  private registerHandlers() {
    //////////////////////////////////////////////
    // config
    this.messageBus.registerHandler(
      'config.get',
      async (data: { cwd: string; key: string }) => {
        const { cwd, key } = data;
        const context = await this.getContext(cwd);
        const value = context.config[key as keyof Config];
        return {
          success: true,
          data: {
            value,
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'config.set',
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
          await context.destroy();
          this.contexts.delete(cwd);
        }
        return {
          success: true,
        };
      },
    );

    this.messageBus.registerHandler(
      'config.remove',
      async (data: {
        cwd: string;
        isGlobal: boolean;
        key: string;
        values?: string[];
      }) => {
        const { cwd, key, isGlobal, values } = data;
        const context = await this.getContext(cwd);
        const configManager = new ConfigManager(cwd, context.productName, {});
        configManager.removeConfig(isGlobal, key, values);
        if (this.contexts.has(cwd)) {
          await context.destroy();
          this.contexts.delete(cwd);
        }
        return {
          success: true,
        };
      },
    );

    this.messageBus.registerHandler(
      'config.list',
      async (data: { cwd: string }) => {
        const { cwd } = data;
        const context = await this.getContext(cwd);
        return {
          success: true,
          data: {
            globalConfigDir: context.paths.globalConfigDir,
            projectConfigDir: context.paths.projectConfigDir,
            config: context.config,
          },
        };
      },
    );

    //////////////////////////////////////////////
    // mcp
    this.messageBus.registerHandler(
      'mcp.getStatus',
      async (data: { cwd: string }) => {
        const { cwd } = data;
        const context = await this.getContext(cwd);
        const mcpManager = context.mcpManager;

        interface ServerData {
          status: string;
          error?: string;
          toolCount: number;
          tools: string[];
        }

        const configuredServers = context.config.mcpServers || {};
        const allServerStatus = await mcpManager.getAllServerStatus();
        const servers: Record<string, ServerData> = {};

        // Get detailed status for each configured server
        for (const serverName of mcpManager.getServerNames()) {
          const serverStatus = allServerStatus[serverName];
          let tools: string[] = [];

          if (serverStatus && serverStatus.status === 'connected') {
            try {
              const serverTools = await mcpManager.getTools([serverName]);
              tools = serverTools.map((tool) => tool.name);
            } catch (err) {
              console.warn(
                `Failed to fetch tools for server ${serverName}:`,
                err,
              );
            }
          }

          servers[serverName] = {
            status: serverStatus?.status || 'disconnected',
            error: serverStatus?.error,
            toolCount: serverStatus?.toolCount || 0,
            tools,
          };
        }

        // Get config paths
        const configManager = new ConfigManager(cwd, context.productName, {});

        return {
          success: true,
          data: {
            servers,
            configs: configuredServers,
            globalConfigPath: configManager.globalConfigPath,
            projectConfigPath: configManager.projectConfigPath,
            isReady: mcpManager.isReady(),
            isLoading: mcpManager.isLoading(),
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'mcp.reconnect',
      async (data: { cwd: string; serverName: string }) => {
        const { cwd, serverName } = data;
        try {
          const context = await this.getContext(cwd);
          const mcpManager = context.mcpManager;

          if (!mcpManager) {
            return {
              success: false,
              error: 'No MCP manager available',
            };
          }

          await mcpManager.retryConnection(serverName);

          return {
            success: true,
            message: `Successfully initiated reconnection for ${serverName}`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    );

    this.messageBus.registerHandler(
      'mcp.list',
      async (data: { cwd: string }) => {
        const { cwd } = data;
        const context = await this.getContext(cwd);
        const configManager = new ConfigManager(cwd, context.productName, {});

        const projectServers = context.config.mcpServers || {};
        const globalConfig = configManager.globalConfig;
        const globalServers = globalConfig.mcpServers || {};

        const mcpManager = context.mcpManager;
        const allServerStatus = await mcpManager.getAllServerStatus();

        // Merge active servers (project takes priority)
        const activeServers: Record<
          string,
          {
            status:
              | 'pending'
              | 'connecting'
              | 'connected'
              | 'failed'
              | 'disconnected';
            config: McpServerConfig;
            error?: string;
            toolCount?: number;
            tools: string[];
            scope: 'global' | 'project';
          }
        > = {};

        for (const [name, config] of Object.entries(globalServers)) {
          if (!config.disable) {
            activeServers[name] = {
              config,
              status: allServerStatus[name]?.status || 'disconnected',
              error: allServerStatus[name]?.error,
              toolCount: allServerStatus[name]?.toolCount || 0,
              tools: [],
              scope: 'global',
            };
          }
        }

        for (const [name, config] of Object.entries(projectServers)) {
          if (!config.disable) {
            activeServers[name] = {
              config,
              status: allServerStatus[name]?.status || 'disconnected',
              error: allServerStatus[name]?.error,
              toolCount: allServerStatus[name]?.toolCount || 0,
              tools: [],
              scope: 'project',
            };
          }
        }

        for (const [name, server] of Object.entries(activeServers)) {
          if (server.status === 'connected') {
            try {
              const serverTools = await mcpManager.getTools([name]);
              server.tools = serverTools.map((tool) => tool.name);
            } catch (err) {
              console.warn(`Failed to fetch tools for server ${name}:`, err);
            }
          }
        }

        return {
          success: true,
          data: {
            projectServers,
            globalServers,
            activeServers,
            projectConfigPath: configManager.projectConfigPath,
            globalConfigPath: configManager.globalConfigPath,
            isReady: mcpManager.isReady(),
            isLoading: mcpManager.isLoading(),
          },
        };
      },
    );

    //////////////////////////////////////////////
    // models
    this.messageBus.registerHandler(
      'models.list',
      async (data: { cwd: string }) => {
        const { cwd } = data;
        const context = await this.getContext(cwd);
        const { providers, model } = await resolveModelWithContext(
          null,
          context,
        );
        const currentModel = model
          ? `${model.provider.id}/${model.model.id}`
          : null;
        const currentModelInfo = model
          ? {
              providerName: model.provider.name,
              modelName: model.model.name,
              modelId: model.model.id,
              modelContextLimit: model.model.limit.context,
            }
          : null;
        const groupedModels = Object.values(
          providers as Record<string, Provider>,
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
            currentModelInfo,
          },
        };
      },
    );

    //////////////////////////////////////////////
    // outputStyles
    this.messageBus.registerHandler(
      'outputStyles.list',
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
    // project
    this.messageBus.registerHandler(
      'project.addHistory',
      async (data: { cwd: string; history: string }) => {
        const { cwd, history } = data;
        const context = await this.getContext(cwd);
        const { GlobalData } = await import('./globalData');
        const globalDataPath = context.paths.getGlobalDataPath();
        const globalData = new GlobalData({
          globalDataPath,
        });
        globalData.addProjectHistory({
          cwd,
          history,
        });
        return {
          success: true,
        };
      },
    );

    this.messageBus.registerHandler(
      'project.clearContext',
      async (data: { cwd?: string }) => {
        await this.clearContext(data.cwd);
        return {
          success: true,
        };
      },
    );

    this.messageBus.registerHandler(
      'project.addMemory',
      async (data: { cwd: string; global: boolean; rule: string }) => {
        const { cwd, global: isGlobal, rule } = data;
        const context = await this.getContext(cwd);
        const { appendFileSync } = await import('fs');
        const { join } = await import('path');

        const memoryFile = isGlobal
          ? join(context.paths.globalConfigDir, 'AGENTS.md')
          : join(cwd, 'AGENTS.md');

        appendFileSync(memoryFile, `- ${rule}\n`, 'utf-8');

        return {
          success: true,
        };
      },
    );

    //////////////////////////////////////////////
    // providers
    this.messageBus.registerHandler(
      'providers.list',
      async (data: { cwd: string }) => {
        const { cwd } = data;
        const context = await this.getContext(cwd);
        const { providers } = await resolveModelWithContext(null, context);
        return {
          success: true,
          data: {
            providers: normalizeProviders(providers, context),
          },
        };
      },
    );

    //////////////////////////////////////////////
    // session
    this.messageBus.registerHandler(
      'session.initialize',
      async (data: { cwd: string; sessionId?: string }) => {
        const context = await this.getContext(data.cwd);
        await context.apply({
          hook: 'initialized',
          args: [{ cwd: data.cwd, quiet: false }],
          type: PluginHookType.Series,
        });
        const [model, modelContextLimit, providers] = await (async () => {
          const { model, providers } = await resolveModelWithContext(
            null,
            context,
          );
          const modelId = model
            ? `${model.provider.id}/${model.model.id}`
            : null;
          const modelContextLimit = model ? model.model.limit.context : null;
          return [
            modelId,
            modelContextLimit,
            normalizeProviders(providers, context),
          ];
        })();

        // Get session config if sessionId is provided
        let sessionSummary: string | undefined;
        let pastedTextMap: Record<string, string> = {};
        let pastedImageMap: Record<string, string> = {};
        if (data.sessionId) {
          try {
            const sessionConfigManager = new SessionConfigManager({
              logPath: context.paths.getSessionLogPath(data.sessionId),
            });
            sessionSummary = sessionConfigManager.config.summary;
            pastedTextMap = sessionConfigManager.config.pastedTextMap || {};
            pastedImageMap = sessionConfigManager.config.pastedImageMap || {};
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
            providers,
            approvalMode: context.config.approvalMode,
            sessionSummary,
            pastedTextMap,
            pastedImageMap,
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'session.messages.list',
      async (data: { cwd: string; sessionId: string }) => {
        const { cwd, sessionId } = data;
        const context = await this.getContext(cwd);
        const { loadSessionMessages } = await import('./session');
        const messages = loadSessionMessages({
          logPath: context.paths.getSessionLogPath(sessionId),
        });
        return {
          success: true,
          data: {
            messages,
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'session.send',
      async (data: {
        message: string | null;
        cwd: string;
        sessionId: string | undefined;
        planMode: boolean;
        model?: string;
        attachments?: ImagePart[];
        parentUuid?: string;
      }) => {
        const { message, cwd, sessionId, model, attachments, parentUuid } =
          data;
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
          attachments,
          model,
          parentUuid,
          onMessage: async (opts) => {
            await this.messageBus.emitEvent('message', {
              message: opts.message,
            });
          },
          onTextDelta: async (text) => {
            await this.messageBus.emitEvent('textDelta', {
              text,
            });
          },
          onChunk: async (chunk, requestId) => {
            await this.messageBus.emitEvent('chunk', {
              chunk,
              requestId,
              sessionId,
              cwd,
            });
          },
          onToolApprove: async ({ toolUse, category }: any) => {
            const result = await this.messageBus.request('toolApproval', {
              toolUse,
              category,
            });
            return result.approved;
          },
          onStreamResult: async (result: StreamResult) => {
            await this.messageBus.emitEvent('streamResult', {
              result,
            });
          },
          signal: abortController.signal,
        });
        this.abortControllers.delete(key);
        return result;
      },
    );

    this.messageBus.registerHandler(
      'session.cancel',
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
      'session.addMessages',
      async (data: { cwd: string; sessionId: string; messages: Message[] }) => {
        const { cwd, sessionId, messages } = data;
        const context = await this.getContext(cwd);
        const jsonlLogger = new JsonlLogger({
          filePath: context.paths.getSessionLogPath(sessionId),
        });
        for (const message of messages) {
          const normalizedMessage = {
            // @ts-expect-error
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

    this.messageBus.registerHandler(
      'session.compact',
      async (data: {
        cwd: string;
        sessionId: string;
        messages: NormalizedMessage[];
      }) => {
        const { cwd, messages } = data;
        const context = await this.getContext(cwd);
        const model = (await resolveModelWithContext(null, context)).model!;
        const summary = await compact({
          messages,
          model,
        });
        return {
          success: true,
          data: {
            summary,
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'session.config.setApprovalMode',
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
      'session.config.addApprovalTools',
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
      'session.config.setSummary',
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
      'session.config.setPastedTextMap',
      async (data: {
        cwd: string;
        sessionId: string;
        pastedTextMap: Record<string, string>;
      }) => {
        const { cwd, sessionId, pastedTextMap } = data;
        const context = await this.getContext(cwd);
        const sessionConfigManager = new SessionConfigManager({
          logPath: context.paths.getSessionLogPath(sessionId),
        });
        sessionConfigManager.config.pastedTextMap = pastedTextMap;
        sessionConfigManager.write();
        return {
          success: true,
        };
      },
    );

    this.messageBus.registerHandler(
      'session.config.setPastedImageMap',
      async (data: {
        cwd: string;
        sessionId: string;
        pastedImageMap: Record<string, string>;
      }) => {
        const { cwd, sessionId, pastedImageMap } = data;
        const context = await this.getContext(cwd);
        const sessionConfigManager = new SessionConfigManager({
          logPath: context.paths.getSessionLogPath(sessionId),
        });
        sessionConfigManager.config.pastedImageMap = pastedImageMap;
        sessionConfigManager.write();
        return {
          success: true,
        };
      },
    );

    //////////////////////////////////////////////
    // sessions
    this.messageBus.registerHandler(
      'sessions.list',
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
      'sessions.resume',
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

    //////////////////////////////////////////////
    // slashCommand
    this.messageBus.registerHandler(
      'slashCommand.list',
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
      'slashCommand.get',
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
      'slashCommand.execute',
      async (data: {
        cwd: string;
        sessionId: string;
        command: string;
        args: string;
      }) => {
        const { cwd, command, args } = data;
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
    // status
    this.messageBus.registerHandler(
      'status.get',
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
    // utils
    this.messageBus.registerHandler(
      'utils.query',
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
      'utils.getPaths',
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
      'utils.telemetry',
      async (data: {
        cwd: string;
        name: string;
        payload: Record<string, any>;
      }) => {
        const { cwd, name, payload } = data;
        const context = await this.getContext(cwd);
        await context.apply({
          hook: 'telemetry',
          args: [
            {
              name,
              payload,
            },
          ],
          type: PluginHookType.Parallel,
        });
        return {
          success: true,
        };
      },
    );

    this.messageBus.registerHandler(
      'utils.files.list',
      async (data: { cwd: string; query?: string }) => {
        const { cwd, query } = data;
        const context = await this.getContext(cwd);
        return {
          success: true,
          data: {
            files: await getFiles({
              cwd,
              maxSize: 50,
              productName: context.productName,
              query: query || '',
            }),
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'utils.tool.executeBash',
      async (data: { cwd: string; command: string }) => {
        const { cwd, command } = data;
        const { createBashTool } = await import('./tools/bash');
        const context = await this.getContext(cwd);
        const bashTool = createBashTool({
          cwd,
          backgroundTaskManager: context.backgroundTaskManager,
        });

        try {
          const result = await bashTool.execute({ command });
          return {
            success: true,
            data: result,
          };
        } catch (error) {
          return {
            success: false,
            error: {
              message: error instanceof Error ? error.message : String(error),
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

function normalizeProviders(providers: ProvidersMap, context: Context) {
  return Object.values(providers as Record<string, Provider>).map(
    (provider) => {
      // Check environment variables for this provider
      const validEnvs: string[] = [];
      // Check provider.env (array of required env var names)
      if (provider.env && Array.isArray(provider.env)) {
        provider.env.forEach((envVar: string) => {
          if (process.env[envVar]) {
            validEnvs.push(envVar);
          }
        });
      }
      // Check provider.apiEnv (array of env var names)
      if (provider.apiEnv && Array.isArray(provider.apiEnv)) {
        provider.apiEnv.forEach((envVar: string) => {
          if (process.env[envVar]) {
            validEnvs.push(envVar);
          }
        });
      }
      // Check if API key is already configured
      const hasApiKey = !!(
        provider.options?.apiKey ||
        context.config.provider?.[provider.id]?.options?.apiKey
      );
      return {
        id: provider.id,
        name: provider.name,
        doc: provider.doc,
        env: provider.env,
        apiEnv: provider.apiEnv,
        validEnvs,
        hasApiKey,
      };
    },
  );
}
