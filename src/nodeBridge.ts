import z from 'zod';
import { compact } from './compact';
import { ConfigManager, type McpServerConfig } from './config';
import { CANCELED_MESSAGE_TEXT } from './constants';
import { Context } from './context';
import { JsonlLogger } from './jsonl';
import type { StreamResult } from './loop';
import type { Message, NormalizedMessage, UserMessage } from './message';
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
import type { ApprovalCategory, ToolUse } from './tool';
import { getFiles } from './utils/files';
import { listDirectory } from './utils/list';
import { randomUUID } from './utils/randomUUID';
import { getCurrentBranch } from './worktree';

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

  // Git URL validation patterns - defined once to avoid regex recompilation
  private readonly GIT_HTTPS_PATTERN =
    /^https?:\/\/(?:[a-zA-Z0-9_.~-]+@)?[a-zA-Z0-9_.~-]+(?:\.[a-zA-Z0-9_.~-]+)*(?::\d+)?\/[a-zA-Z0-9_.~/-]+(\.git)?$/;
  private readonly GIT_SSH_PATTERN =
    /^git@[a-zA-Z0-9_.~-]+(?:\.[a-zA-Z0-9_.~-]+)*:[a-zA-Z0-9_.~/-]+(\.git)?$/;

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
      id: string;
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
      id: worktree.id,
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
    this.messageBus.registerHandler('config.get', async (data) => {
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
    });

    this.messageBus.registerHandler('config.set', async (data) => {
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
    });

    this.messageBus.registerHandler('config.remove', async (data) => {
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
    });

    this.messageBus.registerHandler('config.list', async (data) => {
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
    });

    //////////////////////////////////////////////
    // mcp
    this.messageBus.registerHandler('mcp.getStatus', async (data) => {
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
    });

    this.messageBus.registerHandler('mcp.reconnect', async (data) => {
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
    });

    this.messageBus.registerHandler('mcp.list', async (data) => {
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
    });

    //////////////////////////////////////////////
    // models
    this.messageBus.registerHandler('models.list', async (data) => {
      const { cwd } = data;
      const context = await this.getContext(cwd);
      const { providers, model } = await resolveModelWithContext(null, context);
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
    });

    //////////////////////////////////////////////
    // outputStyles
    this.messageBus.registerHandler('outputStyles.list', async (data) => {
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
    });

    //////////////////////////////////////////////
    // project
    this.messageBus.registerHandler('project.addHistory', async (data) => {
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
    });

    this.messageBus.registerHandler('project.clearContext', async (data) => {
      await this.clearContext(data.cwd);
      return {
        success: true,
      };
    });

    this.messageBus.registerHandler('project.addMemory', async (data) => {
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
    });

    this.messageBus.registerHandler('project.analyzeContext', async (data) => {
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
    });

    this.messageBus.registerHandler('project.getRepoInfo', async (data) => {
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
        const workspaceIds = worktrees.map((w) => w.id);

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
    });

    this.messageBus.registerHandler('project.workspaces.list', async (data) => {
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

        // add root workspace data
        const rootBranch = await getCurrentBranch(gitRoot);
        const rootWorkspaceData = await this.buildWorkspaceData(
          {
            id: `${gitRoot}:${rootBranch}`,
            name: rootBranch,
            path: gitRoot,
            branch: rootBranch,
            isClean: true,
          },
          context,
          gitRoot,
        );
        workspacesData.push(rootWorkspaceData);

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
    });

    this.messageBus.registerHandler('project.workspaces.get', async (data) => {
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
    });

    //////////////////////////////////////////////
    // workspaces operations
    this.messageBus.registerHandler(
      'project.workspaces.create',
      async (data) => {
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
      async (data) => {
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
      async (data) => {
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
      async (data) => {
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
    // git operations
    this.messageBus.registerHandler('git.clone', async (data) => {
      const { url, destination, taskId } = data;

      // Import modules at handler scope so both try and catch can access them
      const { promisify } = await import('util');
      const { spawn, execFile } = await import('child_process');
      const { existsSync, mkdirSync, rmSync } = await import('fs');
      const { join, resolve } = await import('pathe');

      // Declare clonePath at function scope so catch block can access it for cleanup
      let clonePath = '';

      try {
        // Validate inputs
        if (!url || !destination) {
          return {
            success: false,
            error: 'Git URL and destination are required',
          };
        }

        // Sanitize Git URL to prevent command injection
        const sanitizedUrl = url
          .split(/[;&|`$()]/)[0] // Remove shell special characters
          .trim();

        // Check if Git is available
        try {
          const execFilePromise = promisify(execFile);
          await execFilePromise('git', ['--version']);
        } catch (_gitError) {
          return {
            success: false,
            error:
              'Git is not installed or not available in PATH. Please install Git and try again.',
          };
        }

        // Validate URL format with stricter pattern
        // Support URLs with ports, usernames, and common special characters in repo names
        if (
          !this.GIT_HTTPS_PATTERN.test(sanitizedUrl) &&
          !this.GIT_SSH_PATTERN.test(sanitizedUrl)
        ) {
          return {
            success: false,
            error:
              'Invalid Git repository URL format. Please use HTTPS or SSH format.',
          };
        }

        // Ensure destination directory exists
        if (!existsSync(destination)) {
          mkdirSync(destination, { recursive: true });
        }

        // Validate destination path security
        const normalizedDest = resolve(destination);
        const dangerousPaths = [
          '/etc',
          '/usr',
          '/bin',
          '/sbin',
          '/var',
          '/System',
          'C:\\Windows',
          'C:\\Program Files',
        ];

        if (dangerousPaths.some((p) => normalizedDest.startsWith(p))) {
          return {
            success: false,
            error: 'Cannot clone to system directories',
          };
        }

        // Extract repo name from URL
        const repoNameMatch = sanitizedUrl.match(/\/([^/]+?)(\.git)?$/);
        const repoName = repoNameMatch
          ? repoNameMatch[1]
          : `repo-${Date.now()}`;
        clonePath = join(destination, repoName);

        // Check if directory already exists
        if (existsSync(clonePath)) {
          return {
            success: false,
            error: `Directory '${repoName}' already exists at destination`,
          };
        }

        // Clone the repository using spawn for better error handling
        // spawn doesn't use a shell, preventing command injection
        let gitProcess: ReturnType<typeof spawn> | null = null;
        let isCancelled = false; // Track if user cancelled the operation
        const clonePromise = new Promise<void>((resolve, reject) => {
          // Use GIT_SSH_COMMAND to auto-accept SSH host keys on first connection
          // This prevents interactive prompts that would hang the clone process
          const env: Record<string, string> = {
            ...process.env,
            GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=accept-new',
          };

          // TODO: Implement HTTPS authentication with username/password
          // Currently only supports:
          // 1. Public HTTPS repos (no auth needed)
          // 2. SSH repos with pre-configured keys
          // Future: Add credential input dialog for private HTTPS repos

          gitProcess = spawn(
            'git',
            ['clone', '--progress', sanitizedUrl, clonePath],
            { env },
          );
          let stderr = '';
          let currentStage = '';
          const stageProgress = { receiving: 0, resolving: 0, checking: 0 };
          let lastOverallPercent = 0; // Track last emitted progress to prevent regression

          // Set up abort controller for cancellation
          if (taskId) {
            const abortController = new AbortController();
            this.abortControllers.set(taskId, abortController);

            abortController.signal.addEventListener('abort', async () => {
              isCancelled = true; // Mark as cancelled
              if (gitProcess) {
                // Clean up event listeners to prevent memory leaks
                gitProcess.stdout?.removeAllListeners();
                gitProcess.stderr?.removeAllListeners();
                gitProcess.removeAllListeners();

                // Try graceful shutdown first
                gitProcess.kill('SIGTERM');
                // Wait 1 second for graceful shutdown, then force kill
                setTimeout(() => {
                  if (gitProcess && !gitProcess.killed) {
                    gitProcess.kill('SIGKILL');
                  }
                }, 1000);
              }
              reject(new Error('Clone operation cancelled by user'));
            });
          }

          // Git outputs progress to stderr
          gitProcess.stderr?.on('data', (data: Buffer) => {
            const output = data.toString();
            stderr += output;

            // Parse and emit progress events
            // Git clone has multiple stages with varying durations depending on repo size
            // We use adaptive progress tracking based on which stages actually occur
            // Support both English and Chinese Git output
            const progressMatch = output.match(/(\d+)%/);
            if (progressMatch) {
              const percent = Number.parseInt(progressMatch[1], 10);

              // Detect current stage and update stage progress
              // Support both English and Chinese (接收对象中 = Receiving objects, 处理 delta 中 = Resolving deltas, 检出文件中 = Checking out files)
              if (
                output.includes('Receiving objects') ||
                output.includes('接收对象中')
              ) {
                currentStage = 'receiving';
                stageProgress.receiving = percent;
              } else if (
                output.includes('Resolving deltas') ||
                output.includes('处理 delta 中')
              ) {
                // Mark receiving as complete when resolving starts
                if (stageProgress.receiving === 0) {
                  stageProgress.receiving = 100;
                }

                // Reset lastOverallPercent when transitioning to new stage
                // This prevents the monotonic check from blocking legitimate progress decrease
                // when switching from single-stage (receiving 100%) to multi-stage calculation
                if (currentStage !== 'resolving') {
                  lastOverallPercent = 0;
                }

                currentStage = 'resolving';
                stageProgress.resolving = percent;
              } else if (
                output.includes('Checking out files') ||
                output.includes('检出文件中')
              ) {
                // Mark previous stages as complete
                if (stageProgress.receiving === 0) {
                  stageProgress.receiving = 100;
                }
                if (stageProgress.resolving === 0) {
                  stageProgress.resolving = 100;
                }

                // Reset lastOverallPercent when transitioning to new stage
                if (currentStage !== 'checking') {
                  lastOverallPercent = 0;
                }

                currentStage = 'checking';
                stageProgress.checking = percent;
              } else {
                // Unknown stage with percentage - skip to avoid noise
                // This filters out non-progress lines like "remote: Counting objects: 10%"
                return;
              }

              // Calculate overall progress (0-100%)
              // Use adaptive weighting based on which stages are active
              let overallPercent = 0;

              // Determine active stages
              const hasResolving =
                stageProgress.resolving > 0 || currentStage === 'resolving';
              const hasChecking =
                stageProgress.checking > 0 || currentStage === 'checking';

              if (hasResolving && hasChecking) {
                // All three stages: Receiving(0-70%), Resolving(70-90%), Checking(90-100%)
                overallPercent =
                  Math.floor((stageProgress.receiving * 70) / 100) +
                  Math.floor((stageProgress.resolving * 20) / 100) +
                  Math.floor((stageProgress.checking * 10) / 100);
              } else if (hasResolving) {
                // Two stages: Receiving(0-80%), Resolving(80-100%)
                overallPercent =
                  Math.floor((stageProgress.receiving * 80) / 100) +
                  Math.floor((stageProgress.resolving * 20) / 100);
              } else {
                // Single stage (small repos): Receiving(0-100%)
                overallPercent = stageProgress.receiving;
              }

              // Ensure progress only increases (monotonic progress)
              // This prevents UI from showing progress regression when stages transition
              overallPercent = Math.max(overallPercent, lastOverallPercent);
              lastOverallPercent = overallPercent;

              this.messageBus.emitEvent('git.clone.progress', {
                taskId,
                percent: overallPercent,
                message: output.trim(),
              });
            }
          });

          gitProcess.on('error', (error) => {
            reject(error);
          });

          gitProcess.on('close', (code) => {
            // If user cancelled, the abort handler already rejected with proper message
            // Don't reject again with stderr to avoid overwriting the cancellation message
            if (isCancelled) {
              return;
            }

            if (code === 0) {
              // Send 100% progress on successful completion
              this.messageBus.emitEvent('git.clone.progress', {
                taskId,
                percent: 100,
                message: 'Clone completed',
              });
              resolve();
            } else {
              reject(new Error(stderr || `Git clone exited with code ${code}`));
            }
          });
        });

        // Add timeout with configurable duration (default 30 minutes)
        // Can be overridden via environment variable GIT_CLONE_TIMEOUT_MINUTES
        const timeoutMinutes = process.env.GIT_CLONE_TIMEOUT_MINUTES
          ? Number.parseInt(process.env.GIT_CLONE_TIMEOUT_MINUTES, 10)
          : 30;
        const CLONE_TIMEOUT = timeoutMinutes * 60 * 1000;
        let timeoutId: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            // Kill the git process on timeout
            if (gitProcess) {
              gitProcess.kill('SIGTERM');
            }
            reject(
              new Error(
                'Clone operation timed out. The repository might be too large or the connection is slow.',
              ),
            );
          }, CLONE_TIMEOUT);
        });

        try {
          await Promise.race([clonePromise, timeoutPromise]);
        } finally {
          // Clean up timeout regardless of success or failure
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          // Clean up abort controller if exists
          if (taskId && this.abortControllers.has(taskId)) {
            this.abortControllers.delete(taskId);
          }
        }

        return {
          success: true,
          data: {
            clonePath,
            repoName,
          },
        };
      } catch (error: any) {
        // Clean up abort controller in catch block as well (for early returns)
        if (taskId && this.abortControllers.has(taskId)) {
          this.abortControllers.delete(taskId);
        }

        // Clean up incomplete clone directory on failure
        // Reuse the clonePath variable from outer scope to avoid duplication
        if (clonePath && existsSync(clonePath)) {
          try {
            rmSync(clonePath, { recursive: true, force: true });
          } catch (_cleanupError) {
            // Cleanup failed, ignore
          }
        }

        // Handle common git clone errors
        const errorMessage = error.message || 'Unknown error';

        // SSH-related errors
        if (
          errorMessage.includes('Host key verification failed') ||
          errorMessage.includes('Permission denied (publickey)')
        ) {
          return {
            success: false,
            error:
              'SSH authentication failed. Please ensure your SSH keys are properly configured.',
            errorCode: 'SSH_AUTH_FAILED',
          };
        }

        // HTTPS authentication errors
        if (
          errorMessage.includes('Authentication failed') ||
          errorMessage.includes('could not read Username') ||
          errorMessage.includes('could not read Password')
        ) {
          return {
            success: false,
            error:
              'Authentication required. Please provide username and password.',
            errorCode: 'AUTH_REQUIRED',
            needsCredentials: true,
          };
        }

        if (errorMessage.includes('Could not resolve hostname')) {
          return {
            success: false,
            error:
              'Could not resolve hostname. Please check your internet connection and the repository URL.',
          };
        }

        if (
          errorMessage.includes('not found') ||
          errorMessage.includes('404')
        ) {
          return {
            success: false,
            error: 'Repository not found or access denied',
          };
        }

        // User cancelled the operation
        if (errorMessage.includes('cancelled by user')) {
          return {
            success: false,
            error: 'Clone operation cancelled by user',
            errorCode: 'CANCELLED',
          };
        }

        return {
          success: false,
          error:
            'Failed to clone repository. Please check the URL and try again.',
        };
      }
    });

    // Cancel git clone operation
    this.messageBus.registerHandler('git.clone.cancel', async (data) => {
      const { taskId } = data;
      const controller = this.abortControllers.get(taskId);

      if (controller) {
        controller.abort();
        this.abortControllers.delete(taskId);
        return { success: true };
      }
      return {
        success: false,
        error: 'Clone task not found or already completed',
      };
    });

    //////////////////////////////////////////////
    // providers
    this.messageBus.registerHandler('providers.list', async (data) => {
      const { cwd } = data;
      const context = await this.getContext(cwd);
      const { providers } = await resolveModelWithContext(null, context);
      return {
        success: true,
        data: {
          providers: normalizeProviders(providers, context),
        },
      };
    });

    //////////////////////////////////////////////
    // session
    this.messageBus.registerHandler('session.initialize', async (data) => {
      const context = await this.getContext(data.cwd);
      await context.apply({
        hook: 'initialized',
        args: [{ cwd: data.cwd, quiet: false }],
        type: PluginHookType.Series,
      });
      const m = (
        await this.messageBus.messageHandlers.get('session.getModel')?.({
          cwd: data.cwd,
          sessionId: data.sessionId,
        })
      )?.data.model;
      const { model, providers, error } = await resolveModelWithContext(
        m,
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
    });

    this.messageBus.registerHandler('session.messages.list', async (data) => {
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
    });

    this.messageBus.registerHandler('session.getModel', async (data) => {
      const { cwd, sessionId } = data;
      const context = await this.getContext(cwd);
      const sessionConfigManager = new SessionConfigManager({
        logPath: context.paths.getSessionLogPath(sessionId),
      });
      const model =
        // 1. model from argv config
        context.argvConfig?.model ||
        // 2. model from session config
        sessionConfigManager.config.model ||
        // 3. model from context config
        context.config.model;
      return {
        success: true,
        data: {
          model,
        },
      };
    });

    this.messageBus.registerHandler('session.send', async (data) => {
      const { message, cwd, sessionId, model, attachments, parentUuid } = data;
      const context = await this.getContext(cwd);
      const project = new Project({
        sessionId,
        context,
      });

      const resolvedModel =
        // e.g. model from slash command or agent
        model ||
        (
          await this.messageBus.messageHandlers.get('session.getModel')?.({
            cwd,
            sessionId,
          })
        )?.data.model;

      const abortController = new AbortController();
      const key = buildSignalKey(cwd, project.session.id);
      this.abortControllers.set(key, abortController);

      const fn = data.planMode ? project.plan : project.send;
      const result = await fn.call(project, message, {
        attachments,
        model: resolvedModel,
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
        onToolApprove: async ({
          toolUse,
          category,
        }: {
          toolUse: ToolUse;
          category?: ApprovalCategory;
        }) => {
          const result = await this.messageBus.request('toolApproval', {
            toolUse,
            category,
          });

          return result.params
            ? { approved: result.approved, params: result.params }
            : result.approved;
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
    });

    this.messageBus.registerHandler('session.cancel', async (data) => {
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
    });

    this.messageBus.registerHandler('session.addMessages', async (data) => {
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
    });

    this.messageBus.registerHandler('session.compact', async (data) => {
      const { cwd, messages, sessionId } = data;
      const context = await this.getContext(cwd);
      const m = (
        await this.messageBus.messageHandlers.get('session.getModel')?.({
          cwd,
          sessionId,
        })
      )?.data.model;
      const model = (await resolveModelWithContext(m, context)).model!;
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
    });

    this.messageBus.registerHandler(
      'session.config.setApprovalMode',
      async (data) => {
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
      async (data) => {
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
      async (data) => {
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
      async (data) => {
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
      async (data) => {
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
      async (data) => {
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
      async (data) => {
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
      async (data) => {
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

    this.messageBus.registerHandler('session.config.set', async (data) => {
      const { cwd, sessionId, key, value } = data;
      const context = await this.getContext(cwd);
      const sessionConfigManager = new SessionConfigManager({
        logPath: context.paths.getSessionLogPath(sessionId),
      });
      (sessionConfigManager.config as any)[key] = value;
      sessionConfigManager.write();
      return {
        success: true,
      };
    });

    this.messageBus.registerHandler('session.config.get', async (data) => {
      const { cwd, sessionId, key } = data;
      const context = await this.getContext(cwd);
      const sessionConfigManager = new SessionConfigManager({
        logPath: context.paths.getSessionLogPath(sessionId),
      });
      const value = key
        ? (sessionConfigManager.config as any)[key]
        : sessionConfigManager.config;
      return {
        success: true,
        data: {
          value,
        },
      };
    });

    this.messageBus.registerHandler('session.config.remove', async (data) => {
      const { cwd, sessionId, key } = data;
      const context = await this.getContext(cwd);
      const sessionConfigManager = new SessionConfigManager({
        logPath: context.paths.getSessionLogPath(sessionId),
      });
      delete (sessionConfigManager.config as any)[key];
      sessionConfigManager.write();
      return {
        success: true,
      };
    });

    //////////////////////////////////////////////
    // sessions
    this.messageBus.registerHandler('sessions.list', async (data) => {
      const { cwd } = data;
      const context = await this.getContext(cwd);
      const sessions = context.paths.getAllSessions();
      return {
        success: true,
        data: {
          sessions,
        },
      };
    });

    this.messageBus.registerHandler('sessions.resume', async (data) => {
      const { cwd, sessionId } = data;
      const context = await this.getContext(cwd);
      return {
        success: true,
        data: {
          sessionId,
          logFile: context.paths.getSessionLogPath(sessionId),
        },
      };
    });

    //////////////////////////////////////////////
    // slashCommand
    this.messageBus.registerHandler('slashCommand.list', async (data) => {
      const { cwd } = data;
      const context = await this.getContext(cwd);
      const slashCommandManager = await SlashCommandManager.create(context);
      return {
        success: true,
        data: {
          slashCommands: slashCommandManager.getAll(),
        },
      };
    });

    this.messageBus.registerHandler('slashCommand.get', async (data) => {
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
    });

    this.messageBus.registerHandler('slashCommand.execute', async (data) => {
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
          if (message.role === 'user' && typeof message.content === 'string') {
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
    });

    //////////////////////////////////////////////
    // status
    this.messageBus.registerHandler('status.get', async (data) => {
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
    });

    //////////////////////////////////////////////
    // utils
    this.messageBus.registerHandler('utils.query', async (data) => {
      const { userPrompt, cwd, systemPrompt } = data;
      const context = await this.getContext(cwd);
      const { model } = await resolveModelWithContext(
        data.model || context.config.model || null,
        context,
      );
      const result = await query({
        userPrompt,
        context,
        systemPrompt,
        model: model!,
        thinking: data.thinking,
        responseFormat: data.responseFormat,
      });
      return result;
    });

    this.messageBus.registerHandler('utils.quickQuery', async (data) => {
      const { cwd } = data;
      const context = await this.getContext(cwd);
      return await this.messageBus.messageHandlers.get('utils.query')?.({
        userPrompt: data.userPrompt,
        cwd,
        systemPrompt: data.systemPrompt,
        model: data.model || context.config.smallModel || null,
        thinking: data.thinking,
        responseFormat: data.responseFormat,
      });
    });

    this.messageBus.registerHandler('utils.summarizeMessage', async (data) => {
      const { message, cwd, model } = data;
      return await this.messageBus.messageHandlers.get('utils.quickQuery')?.({
        model,
        userPrompt: message,
        cwd,
        systemPrompt:
          "Analyze if this message indicates a new conversation topic. If it does, extract a 2-3 word title that captures the new topic. Format your response as a JSON object with one field: 'title' (string).",
        responseFormat: {
          type: 'json',
          schema: z.toJSONSchema(
            z.object({
              title: z.string().nullable(),
            }),
          ),
        },
      });
    });

    this.messageBus.registerHandler('utils.getPaths', async (data) => {
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
    });

    this.messageBus.registerHandler('utils.telemetry', async (data) => {
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
    });

    this.messageBus.registerHandler('utils.files.list', async (data) => {
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
    });

    this.messageBus.registerHandler('utils.tool.executeBash', async (data) => {
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
    });

    this.messageBus.registerHandler('utils.open', async (data) => {
      const { cwd, app } = data;
      const { spawn } = await import('child_process');

      const commands: Record<string, { cmd: string; args: string[] }> = {
        cursor: { cmd: 'cursor', args: [cwd] },
        vscode: { cmd: 'code', args: [cwd] },
        'vscode-insiders': { cmd: 'code-insiders', args: [cwd] },
        zed: { cmd: 'zed', args: [cwd] },
        windsurf: { cmd: 'windsurf', args: [cwd] },
        antigravity: { cmd: 'agy', args: [cwd] },
        iterm: { cmd: 'open', args: ['-a', 'iTerm', cwd] },
        warp: { cmd: 'open', args: ['-a', 'Warp', cwd] },
        terminal: { cmd: 'open', args: ['-a', 'Terminal', cwd] },
        finder: { cmd: 'open', args: [cwd] },
        sourcetree: { cmd: 'open', args: ['-a', 'SourceTree', cwd] },
      };

      const config = commands[app];
      const child = spawn(config.cmd, config.args, {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      return { success: true };
    });

    this.messageBus.registerHandler('utils.detectApps', async (data) => {
      const { apps: appsToCheck } = data;
      const { existsSync } = await import('fs');
      const { execSync } = await import('child_process');

      const allApps = [
        'cursor',
        'vscode',
        'vscode-insiders',
        'zed',
        'windsurf',
        'iterm',
        'warp',
        'terminal',
        'antigravity',
        'finder',
        'sourcetree',
      ] as const;

      const cliCommands: Record<string, string> = {
        cursor: 'cursor',
        vscode: 'code',
        'vscode-insiders': 'code-insiders',
        zed: 'zed',
        windsurf: 'windsurf',
        antigravity: 'agy',
      };

      const macApps: Record<string, string> = {
        iterm: '/Applications/iTerm.app',
        warp: '/Applications/Warp.app',
        terminal: '/Applications/Utilities/Terminal.app',
        finder: '/System/Applications/Finder.app',
        sourcetree: '/Applications/Sourcetree.app',
      };

      const checkApp = (app: string): boolean => {
        if (cliCommands[app]) {
          try {
            execSync(`which ${cliCommands[app]}`, { stdio: 'ignore' });
            return true;
          } catch {
            return false;
          }
        }
        if (macApps[app]) {
          return existsSync(macApps[app]);
        }
        return false;
      };

      const targetApps = appsToCheck || [...allApps];
      const installedApps = targetApps.filter(checkApp);

      return { success: true, data: { apps: installedApps } };
    });
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
