import { compact } from './compact';
import {
  type ApprovalMode,
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
      messageBus: this.messageBus,
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

  /**
   * Build workspace data for a single worktree
   * Used by both project.workspaces.list and project.workspaces.get
   */
  private async buildWorkspaceData(
    worktree: {
      name: string;
      path: string;
      branch: string;
      isClean: boolean;
    },
    context: Context,
    gitRoot: string,
  ) {
    const { getCurrentCommit, getPendingChanges } = await import('./utils/git');
    const { Paths } = await import('./paths');
    const { statSync } = await import('fs');

    // Get git state with error handling
    let currentCommit = '';
    let pendingChanges: string[] = [];
    try {
      currentCommit = await getCurrentCommit(worktree.path);
    } catch {
      // Use empty string as default
    }

    const isDirty = !worktree.isClean;

    try {
      pendingChanges = await getPendingChanges(worktree.path);
    } catch {
      // Use empty array as default
    }

    // Get sessions for this worktree
    const worktreePaths = new Paths({
      productName: context.productName,
      cwd: worktree.path,
    });
    const sessions = worktreePaths.getAllSessions();
    const sessionIds = sessions.map((s) => s.sessionId);

    // Get creation timestamp from filesystem
    let createdAt = Date.now();
    try {
      const stats = statSync(worktree.path);
      createdAt = stats.birthtimeMs || stats.ctimeMs;
    } catch {
      // Use current time as fallback
    }

    // Compute status based on git state
    let status: 'active' | 'archived' | 'stale' = 'active';
    const daysSinceCreation = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > 30 && !isDirty && sessionIds.length === 0) {
      status = 'stale';
    }
    // Note: 'archived' status could be implemented with a metadata file in the future

    // Get active files - currently not available in session metadata
    // This could be extracted from the session log in the future
    const activeFiles: string[] = [];

    // Get worktree-level settings from config
    // For now, we'll use the global config
    const settings = context.config;

    return {
      id: worktree.name,
      repoPath: gitRoot,
      branch: worktree.branch,
      worktreePath: worktree.path,
      sessionIds,
      gitState: {
        currentCommit,
        isDirty,
        pendingChanges,
      },
      metadata: {
        createdAt,
        description: '',
        status,
      },
      context: {
        activeFiles,
        settings,
        preferences: {},
      },
    };
  }

  private registerHandlers() {
    //////////////////////////////////////////////
    // config
    this.messageBus.registerHandler(
      'config.get',
      async (data: { cwd: string; isGlobal: boolean; key: string }) => {
        const { cwd, key, isGlobal } = data;
        const context = await this.getContext(cwd);
        const configManager = new ConfigManager(
          cwd,
          context.productName,
          context.argvConfig,
        );
        const value = configManager.getConfig(isGlobal, key);
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

        const projectConfig = configManager.projectConfig;
        const projectServers = projectConfig.mcpServers || {};
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
        const currentModel = model;
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

    this.messageBus.registerHandler(
      'project.analyzeContext',
      async (data: { cwd: string; sessionId: string }) => {
        const { cwd, sessionId } = data;
        try {
          const context = await this.getContext(cwd);
          const { loadSessionMessages } = await import('./session');
          const { countTokens } = await import('./utils/tokenCounter');
          const { existsSync, readFileSync } = await import('fs');
          const { join } = await import('pathe');

          // Load session messages to find the latest assistant message
          const logPath = context.paths.getSessionLogPath(sessionId);
          const messages = loadSessionMessages({ logPath });

          // Find the last assistant message UUID
          const lastAssistantMessage = messages
            .slice()
            .reverse()
            .find((msg) => msg.role === 'assistant');

          if (!lastAssistantMessage) {
            return {
              success: false,
              error:
                'No context available - send a message first to analyze context usage',
            };
          }

          const requestId = lastAssistantMessage.uuid;
          const requestsDir = join(context.paths.globalProjectDir, 'requests');
          const requestLogPath = join(requestsDir, `${requestId}.jsonl`);

          if (!existsSync(requestLogPath)) {
            return {
              success: false,
              error: 'Request log file not found',
            };
          }

          // Read the first line of the JSONL file (the metadata)
          const content = readFileSync(requestLogPath, 'utf-8');
          const lines = content.split('\n').filter(Boolean);
          if (lines.length === 0) {
            return {
              success: false,
              error: 'Request log is empty',
            };
          }

          let metadata: any;
          try {
            metadata = JSON.parse(lines[0]);
          } catch {
            return {
              success: false,
              error: 'Failed to parse request log',
            };
          }

          const requestBody = metadata.request?.body;
          if (!requestBody) {
            return {
              success: false,
              error: 'Invalid request log format',
            };
          }

          // Get the model context window size
          const { model } = metadata;
          if (!model || !model.model || !model.model.limit) {
            return {
              success: false,
              error: 'Failed to resolve model context window',
            };
          }

          const totalContextWindow = model.model.limit.context;

          // Count tokens for each category
          const systemPromptTokens = (() => {
            const systemPrompt = requestBody.system || [];
            const messages = requestBody.messages || [];
            for (const message of messages) {
              if (message.role === 'system') {
                systemPrompt.push(message);
              }
            }
            if (!systemPrompt.length) return 0;
            return countTokens(JSON.stringify(systemPrompt));
          })();

          const tools = requestBody.tools || [];
          const systemTools: any[] = [];
          const mcpTools: any[] = [];

          for (const tool of tools) {
            if (tool.name?.startsWith('mcp__')) {
              mcpTools.push(tool);
            } else {
              systemTools.push(tool);
            }
          }

          const systemToolsTokens = systemTools.length
            ? countTokens(JSON.stringify(systemTools))
            : 0;
          const mcpToolsTokens = mcpTools.length
            ? countTokens(JSON.stringify(mcpTools))
            : 0;

          const messagesTokens = (() => {
            const messages = (requestBody.messages || []).filter(
              (item: any) => item.role !== 'system',
            );
            return countTokens(JSON.stringify(messages));
          })();

          const totalUsed =
            systemPromptTokens +
            systemToolsTokens +
            mcpToolsTokens +
            messagesTokens;
          const freeSpaceTokens = Math.max(0, totalContextWindow - totalUsed);

          // Calculate percentages
          const calculatePercentage = (tokens: number) =>
            (tokens / totalContextWindow) * 100;

          return {
            success: true,
            data: {
              systemPrompt: {
                tokens: systemPromptTokens,
                percentage: calculatePercentage(systemPromptTokens),
              },
              systemTools: {
                tokens: systemToolsTokens,
                percentage: calculatePercentage(systemToolsTokens),
              },
              mcpTools: {
                tokens: mcpToolsTokens,
                percentage: calculatePercentage(mcpToolsTokens),
              },
              messages: {
                tokens: messagesTokens,
                percentage: calculatePercentage(messagesTokens),
              },
              freeSpace: {
                tokens: freeSpaceTokens,
                percentage: calculatePercentage(freeSpaceTokens),
              },
              totalContextWindow,
            },
          };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to analyze context',
          };
        }
      },
    );

    this.messageBus.registerHandler(
      'project.getRepoInfo',
      async (data: { cwd: string }) => {
        const { cwd } = data;
        try {
          const context = await this.getContext(cwd);
          const { getGitRoot, listWorktrees, isGitRepository } = await import(
            './worktree'
          );
          const { getGitRemoteUrl, getDefaultBranch, getGitSyncStatus } =
            await import('./utils/git');
          const { GlobalData } = await import('./globalData');
          const { basename } = await import('pathe');

          // Check if it's a git repository
          const isGit = await isGitRepository(cwd);
          if (!isGit) {
            return {
              success: false,
              error: 'Not a git repository',
            };
          }

          // Get git root path
          const gitRoot = await getGitRoot(cwd);

          // Get git remote information
          const originUrl = await getGitRemoteUrl(gitRoot);
          const defaultBranch = await getDefaultBranch(gitRoot);
          const syncStatus = await getGitSyncStatus(gitRoot);

          // Get workspace names
          const worktrees = await listWorktrees(gitRoot);
          const workspaceIds = worktrees.map((w) => w.name);

          // Get last accessed timestamp from GlobalData
          const globalDataPath = context.paths.getGlobalDataPath();
          const globalData = new GlobalData({ globalDataPath });
          const lastAccessed =
            globalData.getProjectLastAccessed({ cwd: gitRoot }) || Date.now();

          // Update last accessed time
          globalData.updateProjectLastAccessed({ cwd: gitRoot });

          // Get project settings from config
          const settings = context.config;

          const repoData = {
            path: gitRoot,
            name: basename(gitRoot),
            workspaceIds,
            metadata: {
              lastAccessed,
              settings,
            },
            gitRemote: {
              originUrl,
              defaultBranch,
              syncStatus,
            },
          };

          return {
            success: true,
            data: { repoData },
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Failed to get repository info',
          };
        }
      },
    );

    this.messageBus.registerHandler(
      'project.workspaces.list',
      async (data: { cwd: string }) => {
        const { cwd } = data;
        try {
          const context = await this.getContext(cwd);
          const { getGitRoot, listWorktrees, isGitRepository } = await import(
            './worktree'
          );

          // Check if it's a git repository
          const isGit = await isGitRepository(cwd);
          if (!isGit) {
            return {
              success: false,
              error: 'Not a git repository',
            };
          }

          // Get git root path
          const gitRoot = await getGitRoot(cwd);

          // Get all worktrees
          const worktrees = await listWorktrees(gitRoot);

          // Build workspace data for each worktree using the helper
          const workspacesData = await Promise.all(
            worktrees.map((worktree) =>
              this.buildWorkspaceData(worktree, context, gitRoot),
            ),
          );

          return {
            success: true,
            data: { workspaces: workspacesData },
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Failed to get workspaces info',
          };
        }
      },
    );

    this.messageBus.registerHandler(
      'project.workspaces.get',
      async (data: { cwd: string; workspaceId: string }) => {
        const { cwd, workspaceId } = data;
        try {
          const context = await this.getContext(cwd);
          const { getGitRoot, listWorktrees, isGitRepository } = await import(
            './worktree'
          );

          // Check if it's a git repository
          const isGit = await isGitRepository(cwd);
          if (!isGit) {
            return {
              success: false,
              error: 'Not a git repository',
            };
          }

          // Get git root path
          const gitRoot = await getGitRoot(cwd);

          // Get all worktrees
          const worktrees = await listWorktrees(gitRoot);

          // Find the worktree matching the workspace ID
          const worktree = worktrees.find((w) => w.name === workspaceId);
          if (!worktree) {
            return {
              success: false,
              error: `Workspace '${workspaceId}' not found`,
            };
          }

          // Build workspace data for the single worktree using the helper
          const workspaceData = await this.buildWorkspaceData(
            worktree,
            context,
            gitRoot,
          );

          return {
            success: true,
            data: workspaceData,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Failed to get workspace info',
          };
        }
      },
    );

    //////////////////////////////////////////////
    // workspaces operations
    this.messageBus.registerHandler(
      'project.workspaces.create',
      async (data: { cwd: string; name?: string; skipUpdate?: boolean }) => {
        const { cwd, name, skipUpdate = false } = data;
        try {
          const context = await this.getContext(cwd);
          const {
            getGitRoot,
            isGitRepository,
            detectMainBranch,
            updateMainBranch,
            generateWorkspaceName,
            createWorktree,
            addToGitExclude,
          } = await import('./worktree');
          const { existsSync, mkdirSync } = await import('fs');
          const { join } = await import('pathe');

          // Check if it's a git repository
          const isGit = await isGitRepository(cwd);
          if (!isGit) {
            return {
              success: false,
              error: 'Not a git repository',
            };
          }

          // Get git root path
          const gitRoot = await getGitRoot(cwd);

          // Detect main branch
          const mainBranch = await detectMainBranch(gitRoot);

          // Update main branch if not skipped
          await updateMainBranch(gitRoot, mainBranch, skipUpdate);

          // Generate or use provided workspace name
          const workspaceName = name || (await generateWorkspaceName(gitRoot));

          // Ensure .neovate-workspaces directory exists
          const workspacesDir = join(
            gitRoot,
            `.${context.productName}-workspaces`,
          );
          if (!existsSync(workspacesDir)) {
            mkdirSync(workspacesDir, { recursive: true });
          }

          // Create worktree
          const worktree = await createWorktree(gitRoot, workspaceName, {
            baseBranch: mainBranch,
            workspacesDir: `.${context.productName}-workspaces`,
          });

          // Add workspaces directory to git exclude
          await addToGitExclude(gitRoot);

          return {
            success: true,
            data: {
              workspace: {
                name: worktree.name,
                path: worktree.path,
                branch: worktree.branch,
              },
            },
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Failed to create workspace',
          };
        }
      },
    );

    this.messageBus.registerHandler(
      'project.workspaces.delete',
      async (data: { cwd: string; name: string; force?: boolean }) => {
        const { cwd, name, force = false } = data;
        try {
          await this.getContext(cwd);
          const { getGitRoot, isGitRepository, deleteWorktree } = await import(
            './worktree'
          );

          // Check if it's a git repository
          const isGit = await isGitRepository(cwd);
          if (!isGit) {
            return {
              success: false,
              error: 'Not a git repository',
            };
          }

          // Get git root path
          const gitRoot = await getGitRoot(cwd);

          // Delete worktree
          await deleteWorktree(gitRoot, name, force);

          return {
            success: true,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Failed to delete workspace',
          };
        }
      },
    );

    this.messageBus.registerHandler(
      'project.workspaces.merge',
      async (data: { cwd: string; name: string }) => {
        const { cwd, name } = data;
        try {
          await this.getContext(cwd);
          const { getGitRoot, isGitRepository, listWorktrees, mergeWorktree } =
            await import('./worktree');

          // Check if it's a git repository
          const isGit = await isGitRepository(cwd);
          if (!isGit) {
            return {
              success: false,
              error: 'Not a git repository',
            };
          }

          // Get git root path
          const gitRoot = await getGitRoot(cwd);

          // List worktrees to find target workspace
          const worktrees = await listWorktrees(gitRoot);
          const worktree = worktrees.find((w) => w.name === name);

          if (!worktree) {
            return {
              success: false,
              error: `Workspace '${name}' not found`,
            };
          }

          // Merge worktree back to original branch
          await mergeWorktree(gitRoot, worktree);

          return {
            success: true,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Failed to merge workspace',
          };
        }
      },
    );

    this.messageBus.registerHandler(
      'project.workspaces.createGithubPR',
      async (data: {
        cwd: string;
        name: string;
        title?: string;
        description?: string;
        baseBranch?: string;
      }) => {
        const { cwd, name, title, description = '', baseBranch } = data;
        try {
          await this.getContext(cwd);
          const {
            getGitRoot,
            isGitRepository,
            listWorktrees,
            ensureCleanWorkingDirectory,
            detectMainBranch,
          } = await import('./worktree');
          const { promisify } = await import('util');
          const execPromise = promisify((await import('child_process')).exec);

          // Check if it's a git repository
          const isGit = await isGitRepository(cwd);
          if (!isGit) {
            return {
              success: false,
              error: 'Not a git repository',
            };
          }

          // Get git root path
          const gitRoot = await getGitRoot(cwd);

          // List worktrees to find target workspace
          const worktrees = await listWorktrees(gitRoot);
          const worktree = worktrees.find((w) => w.name === name);

          if (!worktree) {
            return {
              success: false,
              error: `Workspace '${name}' not found`,
            };
          }

          // Ensure workspace has no uncommitted changes
          await ensureCleanWorkingDirectory(worktree.path);

          // Push workspace branch to remote
          try {
            await execPromise(`git push origin ${worktree.branch}`, {
              cwd: worktree.path,
            });
          } catch (error: any) {
            return {
              success: false,
              error: `Failed to push branch: ${error.message}`,
            };
          }

          // Detect base branch if not provided
          const targetBranch = baseBranch || (await detectMainBranch(gitRoot));

          // Generate title from branch name if not provided
          const prTitle =
            title ||
            worktree.branch
              .replace('workspace/', '')
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase());

          // Create PR using GitHub CLI
          try {
            const ghCommand = [
              'gh pr create',
              `--base ${targetBranch}`,
              `--head ${worktree.branch}`,
              `--title "${prTitle}"`,
              description ? `--body "${description}"` : '--body ""',
            ].join(' ');

            const { stdout } = await execPromise(ghCommand, {
              cwd: worktree.path,
            });

            // Parse PR URL from output (gh pr create returns the PR URL)
            const prUrl = stdout.trim();
            // Extract PR number from URL (e.g., https://github.com/owner/repo/pull/123)
            const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
            const prNumber = prNumberMatch ? parseInt(prNumberMatch[1], 10) : 0;

            return {
              success: true,
              data: {
                prUrl,
                prNumber,
              },
            };
          } catch (error: any) {
            if (error.message?.includes('gh: command not found')) {
              return {
                success: false,
                error:
                  'GitHub CLI (gh) is not installed. Please install it from https://cli.github.com/',
              };
            }
            if (error.message?.includes('not authenticated')) {
              return {
                success: false,
                error:
                  'GitHub CLI is not authenticated. Please run: gh auth login',
              };
            }
            if (error.message?.includes('already exists')) {
              return {
                success: false,
                error: 'A pull request already exists for this branch',
              };
            }
            return {
              success: false,
              error: `Failed to create PR: ${error.message}`,
            };
          }
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Failed to create GitHub PR',
          };
        }
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
        const { model, providers, error } = await resolveModelWithContext(
          null,
          context,
        );

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
          } catch {
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
            planModel: context.config.planModel,
            initializeModelError: error instanceof Error ? error.message : null,
            providers: normalizeProviders(providers, context),
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
        thinking?: {
          effort: 'low' | 'medium' | 'high';
        };
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
          thinking: data.thinking,
          onMessage: async (opts) => {
            await this.messageBus.emitEvent('message', {
              message: opts.message,
              sessionId,
              cwd,
            });
          },
          onTextDelta: async (text) => {
            await this.messageBus.emitEvent('textDelta', {
              text,
              sessionId,
              cwd,
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
              sessionId,
              cwd,
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

        // Load current messages to check for incomplete tool_uses
        const { loadSessionMessages } = await import('./session');
        const { findIncompleteToolUses } = await import('./message');

        const messages = loadSessionMessages({
          logPath: context.paths.getSessionLogPath(sessionId),
        });

        // Check for incomplete tool_uses and add tool_result messages
        const incompleteResult = findIncompleteToolUses(messages);
        if (incompleteResult) {
          const { assistantMessage, incompleteToolUses } = incompleteResult;

          // Add a tool_result message for each incomplete tool_use
          for (const toolUse of incompleteToolUses) {
            const normalizedToolResultMessage: NormalizedMessage & {
              sessionId: string;
            } = {
              parentUuid: assistantMessage.uuid,
              uuid: randomUUID(),
              role: 'tool',
              content: [
                {
                  type: 'tool-result',
                  toolCallId: toolUse.id,
                  toolName: toolUse.name,
                  input: toolUse.input,
                  result: {
                    llmContent: CANCELED_MESSAGE_TEXT,
                    returnDisplay: 'Tool execution was canceled by user.',
                    isError: true,
                  },
                },
              ],
              type: 'message',
              timestamp: new Date().toISOString(),
              sessionId,
            };

            await this.messageBus.emitEvent('message', {
              message: jsonlLogger.addMessage({
                message: normalizedToolResultMessage,
              }),
            });
          }

          return {
            success: true,
          };
        }

        // Always add the user cancellation message
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
      async (data: {
        cwd: string;
        sessionId: string;
        messages: Message[];
        parentUuid?: string;
      }) => {
        const { cwd, sessionId, messages, parentUuid } = data;
        const context = await this.getContext(cwd);
        const jsonlLogger = new JsonlLogger({
          filePath: context.paths.getSessionLogPath(sessionId),
        });

        let previousUuid = parentUuid ?? jsonlLogger.getLatestUuid();

        for (const message of messages) {
          const normalizedMessage = {
            // @ts-expect-error
            parentUuid: message.parentUuid ?? previousUuid,
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
          previousUuid = normalizedMessage.uuid;
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

    this.messageBus.registerHandler(
      'session.config.getAdditionalDirectories',
      async (data: { cwd: string; sessionId: string }) => {
        const { cwd, sessionId } = data;
        const context = await this.getContext(cwd);
        const sessionConfigManager = new SessionConfigManager({
          logPath: context.paths.getSessionLogPath(sessionId),
        });
        return {
          success: true,
          data: {
            directories:
              sessionConfigManager.config.additionalDirectories || [],
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'session.config.addDirectory',
      async (data: { cwd: string; sessionId: string; directory: string }) => {
        const { cwd, sessionId, directory } = data;
        const context = await this.getContext(cwd);
        const sessionConfigManager = new SessionConfigManager({
          logPath: context.paths.getSessionLogPath(sessionId),
        });
        const directories =
          sessionConfigManager.config.additionalDirectories || [];
        if (!directories.includes(directory)) {
          directories.push(directory);
          sessionConfigManager.config.additionalDirectories = directories;
          sessionConfigManager.write();
        }
        return {
          success: true,
        };
      },
    );

    this.messageBus.registerHandler(
      'session.config.removeDirectory',
      async (data: { cwd: string; sessionId: string; directory: string }) => {
        const { cwd, sessionId, directory } = data;
        const context = await this.getContext(cwd);
        const sessionConfigManager = new SessionConfigManager({
          logPath: context.paths.getSessionLogPath(sessionId),
        });
        const directories =
          sessionConfigManager.config.additionalDirectories || [];
        sessionConfigManager.config.additionalDirectories = directories.filter(
          (dir) => dir !== directory,
        );
        sessionConfigManager.write();
        return {
          success: true,
        };
      },
    );

    this.messageBus.registerHandler(
      'session.restoreCode',
      async (data: {
        cwd: string;
        sessionId: string;
        targetMessageUuid: string;
      }) => {
        const { cwd, sessionId, targetMessageUuid } = data;
        const context = await this.getContext(cwd);
        const sessionConfigManager = new SessionConfigManager({
          logPath: context.paths.getSessionLogPath(sessionId),
        });

        const { buildRestoreOperations, restoreFilesFromOperations } =
          await import('./utils/snapshot');
        const { loadSessionMessages } = await import('./session');

        // Get all file snapshots
        const fileSnapshots = sessionConfigManager.config.fileSnapshots || [];

        // Load messages to resolve parent relationships
        const messages = loadSessionMessages({
          logPath: context.paths.getSessionLogPath(sessionId),
        });

        // Get target snapshot to extract user prompt
        const targetSnapshot = fileSnapshots.find(
          (s) => s.messageUuid === targetMessageUuid,
        );

        if (!targetSnapshot) {
          return {
            success: false,
            data: {
              restoredFiles: [],
              skippedBashFiles: [],
              skippedLargeFiles: [],
              errors: [{ file: '', error: 'Target snapshot not found' }],
              userPromptToFill: undefined,
            },
            error: { message: 'Target snapshot not found' },
          };
        }

        const userPromptToFill = targetSnapshot.userPrompt;

        // Build restore operations (parent state + cleanup files created after)
        // Pass messages to buildRestoreOperations so it can resolve parent snapshots correctly
        const operations = buildRestoreOperations(
          fileSnapshots,
          targetMessageUuid,
          messages,
        );

        // Get maxFileSize before using it
        const maxFileSize = context.config.snapshot?.maxFileSize;

        const fs = await import('fs');
        const path = await import('pathe');

        // Restore to target's parent state
        const result = restoreFilesFromOperations(operations, cwd, maxFileSize);

        // CRITICAL: Only clean history if file restoration is completely successful
        // If restoration fails, keep snapshots and history intact for retry
        if (!result.success || result.errors.length > 0) {
          return {
            success: false,
            data: {
              restoredFiles: result.restoredFiles,
              skippedBashFiles: result.skippedBashFiles,
              skippedLargeFiles: result.skippedLargeFiles,
              errors: result.errors,
              userPromptToFill: undefined,
            },
            error: {
              message: `File restoration failed: ${result.errors.map((e) => e.error).join('; ')}. Snapshots and history preserved for retry.`,
            },
          };
        }

        // File restoration succeeded, now clean conversation history and snapshots
        try {
          // Reuse already loaded messages (no need to reload)
          // const messages is already available from line 1663

          // Find the target message to get timestamp and parent
          const targetMessage = messages.find(
            (m) => m.uuid === targetMessageUuid,
          );
          const timestamp = targetMessage?.timestamp
            ? new Date(targetMessage.timestamp).toLocaleString()
            : 'previous state';

          // Find the target message index (will be reused later for filtering)
          const targetMsgIndex = messages.findIndex(
            (m) => m.uuid === targetMessageUuid,
          );

          // Find the correct parent for hint message
          // It should be the last message BEFORE the target (target's parent or earlier)
          const lastMessageBeforeTarget =
            targetMsgIndex > 0 ? messages[targetMsgIndex - 1] : null;

          // Create a hint message
          const { randomUUID } = await import('./utils/randomUUID');
          const hintMessage: NormalizedMessage = {
            parentUuid: lastMessageBeforeTarget?.uuid || null,
            uuid: randomUUID(),
            role: 'assistant',
            content: userPromptToFill
              ? `Code restored to before: ${userPromptToFill}`
              : `Code restored to: ${timestamp}`,
            text: userPromptToFill
              ? `Code restored to before: ${userPromptToFill}`
              : `Code restored to: ${timestamp}`,
            model: 'system',
            usage: { input_tokens: 0, output_tokens: 0 },
            uiContent: [
              '✨ Code and conversation restored successfully',
              '',
              `📁 Restored ${result.restoredFiles.length} file(s)`,
              result.skippedBashFiles.length > 0
                ? `⏭️  Skipped ${result.skippedBashFiles.length} bash-generated file(s)`
                : null,
              result.skippedLargeFiles.length > 0
                ? `⚠️  Skipped ${result.skippedLargeFiles.length} large file(s)`
                : null,
              '',
              userPromptToFill
                ? `🕒 Restored to BEFORE: "${userPromptToFill}"`
                : `🕒 Restored to: ${timestamp}`,
              '',
              userPromptToFill
                ? '💡 The prompt has been filled in the input box.'
                : '',
              userPromptToFill
                ? '   You can edit and run again, or clear it to continue.'
                : 'You can continue your work from this point.',
            ]
              .filter(Boolean)
              .join('\n'),
            type: 'message',
            timestamp: new Date().toISOString(),
          };

          // Clean snapshots: keep only those created BEFORE target time
          // IMPORTANT: We keep snapshots BEFORE target (not including target)
          // because we want to restore to the state BEFORE the target operation
          if (targetSnapshot) {
            const targetTime = new Date(targetSnapshot.timestamp).getTime();

            // Keep all snapshots created BEFORE the target time (excluding target)
            const cleanedSnapshots = fileSnapshots.filter((snapshot) => {
              const snapshotTime = new Date(snapshot.timestamp).getTime();
              return snapshotTime < targetTime;
            });

            // Update session config with cleaned snapshots
            sessionConfigManager.config.fileSnapshots = cleanedSnapshots;
          }

          // Filter messages: keep only those up to (and including) target message's parent
          // This preserves the conversation history up to the restore point
          const targetMessageIndex = messages.findIndex(
            (m) => m.uuid === targetMessageUuid,
          );

          let filteredMessages: any[];
          if (targetMessageIndex >= 0) {
            // Keep all messages BEFORE the target message
            filteredMessages = messages.slice(0, targetMessageIndex);
          } else {
            filteredMessages = messages;
          }

          // Add hint message
          filteredMessages.push(hintMessage);

          // Write filtered messages back to log file
          const fs = await import('fs');
          // Preserve config line with cleaned snapshots
          const configLine = JSON.stringify({
            type: 'config',
            config: sessionConfigManager.config,
          });

          const messageLines = filteredMessages.map((m) => JSON.stringify(m));
          const newContent = [configLine, ...messageLines].join('\n') + '\n';

          fs.writeFileSync(
            context.paths.getSessionLogPath(sessionId),
            newContent,
            'utf-8',
          );
        } catch (error) {
          // If clearing history fails, just log the error but still return success
          // Files have been restored successfully
          console.error(
            'Failed to clear conversation history after restore:',
            error,
          );
          return {
            success: true,
            data: {
              restoredFiles: result.restoredFiles,
              skippedBashFiles: result.skippedBashFiles,
              skippedLargeFiles: result.skippedLargeFiles,
              errors: [],
              userPromptToFill,
            },
            warning:
              'Files restored successfully but history cleanup failed. Please reload the session.',
          };
        }

        // Success: return restored file information
        return {
          success: true,
          data: {
            restoredFiles: result.restoredFiles,
            skippedBashFiles: result.skippedBashFiles,
            skippedLargeFiles: result.skippedLargeFiles,
            errors: [],
            userPromptToFill,
          },
        };
      },
    );

    this.messageBus.registerHandler(
      'session.listSnapshots',
      async (data: { cwd: string; sessionId: string }) => {
        const { cwd, sessionId } = data;
        const context = await this.getContext(cwd);
        const sessionConfigManager = new SessionConfigManager({
          logPath: context.paths.getSessionLogPath(sessionId),
        });
        const { loadSessionMessages } = await import('./session');
        const { relative } = await import('pathe');

        const fileSnapshots = sessionConfigManager.config.fileSnapshots || [];
        const messages = loadSessionMessages({
          logPath: context.paths.getSessionLogPath(sessionId),
        });

        // Build message map for quick lookup
        const messageMap = new Map(messages.map((m) => [m.uuid, m]));

        // Helper to extract user prompt from parent message
        const getUserPrompt = (messageUuid: string): string | undefined => {
          let currentMsg: any = messageMap.get(messageUuid);
          if (!currentMsg) return undefined;

          // Walk backward to find the nearest user message
          const visited = new Set<string>();
          while (currentMsg && !visited.has(currentMsg.uuid)) {
            visited.add(currentMsg.uuid);

            if (currentMsg.role === 'user') {
              // Found user message, extract content
              const content = currentMsg.content;
              if (typeof content === 'string') {
                return content;
              }
              if (Array.isArray(content)) {
                const textParts = content
                  .filter((part: any) => part.type === 'text')
                  .map((part: any) => part.text);
                return textParts.join(' ');
              }
              return undefined;
            }

            // Move to parent
            const parentUuid =
              currentMsg.parentUuid || currentMsg.parentMessageUuid;
            if (!parentUuid) return undefined;
            currentMsg = messageMap.get(parentUuid);
          }

          return undefined;
        };

        // Enrich snapshots with message info
        const enrichedSnapshots = fileSnapshots.map((snapshot) => {
          const message = messageMap.get(snapshot.messageUuid);
          // Prefer userPrompt from snapshot, fallback to getUserPrompt for old snapshots
          const userPrompt =
            snapshot.userPrompt || getUserPrompt(snapshot.messageUuid);

          return {
            messageUuid: snapshot.messageUuid,
            parentMessageUuid: snapshot.parentMessageUuid,
            timestamp: snapshot.timestamp,
            operationCount: snapshot.operations.length,
            affectedFiles: [
              ...new Set(
                snapshot.operations.map((op) => relative(cwd, op.path)),
              ),
            ],
            messageRole: message?.role,
            messageTimestamp: message?.timestamp,
            userPrompt,
          };
        });

        return {
          success: true,
          data: {
            snapshots: enrichedSnapshots,
            totalSnapshots: fileSnapshots.length,
          },
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
      'utils.quickQuery',
      async (data: {
        userPrompt: string;
        cwd: string;
        systemPrompt?: string;
      }) => {
        const { userPrompt, cwd, systemPrompt } = data;
        const context = await this.getContext(cwd);
        const { model } = await resolveModelWithContext(
          context.config.smallModel || null,
          context,
        );
        const result = await query({
          userPrompt,
          model: model!,
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
