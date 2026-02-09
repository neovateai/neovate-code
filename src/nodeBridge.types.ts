/**
 * Type definitions for NodeBridge and UIBridge message handlers.
 * This file provides full type-safety for registerHandler and request methods.
 *
 * @module nodeBridge.types
 */

import type { ApprovalMode, McpServerConfig } from './config';
import type { ResponseFormat, ThinkingConfig } from './loop';
import type { ImagePart, Message, NormalizedMessage } from './message';
import type { ModelInfo, ProvidersMap } from './provider/model';
import type { ApprovalCategory, ToolUse } from './tool';

// ============================================================================
// Common Response Types
// ============================================================================

/** Standard success response without data */
type SuccessResponse = { success: true };

/** Standard error response */
type ErrorResponse = { success: false; error: string };

// ============================================================================
// Config Handlers
// ============================================================================

type ConfigGetInput = {
  cwd: string;
  isGlobal: boolean;
  key: string;
};
type ConfigGetOutput = {
  success: boolean;
  data: { value: any };
};

type ConfigSetInput = {
  cwd: string;
  isGlobal: boolean;
  key: string;
  value: any;
};

type ConfigRemoveInput = {
  cwd: string;
  isGlobal: boolean;
  key: string;
  values?: string[];
};

type ConfigListInput = {
  cwd: string;
};
type ConfigListOutput = {
  success: boolean;
  data: {
    globalConfigDir: string;
    projectConfigDir: string;
    config: any;
  };
};

// ============================================================================
// GlobalData Handlers
// ============================================================================

type GlobalDataRecentModelsGetInput = {
  cwd: string;
};
type GlobalDataRecentModelsGetOutput = {
  success: boolean;
  data: {
    recentModels: string[];
    thinkingLevel: string | undefined;
  };
};

type GlobalDataRecentModelsAddInput = {
  cwd: string;
  model: string;
};

// ============================================================================
// Git Handlers
// ============================================================================

type GitCloneInput = {
  url: string;
  destination: string;
  taskId?: string;
  // TODO: Future enhancement - HTTPS authentication with username/password
  // Currently only supports:
  // 1. Public HTTPS repos (no auth needed)
  // 2. SSH repos with pre-configured keys
  // Future: Add these fields when implementing HTTPS auth
  // username?: string;
  // password?: string;
};
type GitCloneOutput = {
  success: boolean;
  data?: {
    clonePath: string;
    repoName: string;
  };
  error?: string;
  errorCode?: string;
  needsCredentials?: boolean;
};

type GitStatusInput = {
  cwd: string;
};
type GitStatusOutput = {
  success: boolean;
  data?: {
    isRepo: boolean;
    hasUncommittedChanges: boolean;
    hasStagedChanges: boolean;
    isGitInstalled: boolean;
    isUserConfigured: { name: boolean; email: boolean };
    isMerging: boolean;
    unstagedFiles: Array<{ status: string; file: string }>;
  };
  error?: string;
};

type GitStageInput = {
  cwd: string;
  all?: boolean;
};

type GitCommitInput = {
  cwd: string;
  message: string;
  noVerify?: boolean;
};

type GitPushInput = {
  cwd: string;
};

type GitCreateBranchInput = {
  cwd: string;
  name: string;
};
type GitCreateBranchOutput = {
  success: boolean;
  data?: {
    branchName: string;
    wasRenamed: boolean;
  };
  error?: string;
};

type GitDetectGitHubInput = {
  cwd: string;
};
type GitDetectGitHubOutput = {
  success: boolean;
  data?: {
    hasGhCli: boolean;
    isGitHubRemote: boolean;
  };
  error?: string;
};

type GitCreatePRInput = {
  cwd: string;
  branchName: string;
  body?: string;
};
type GitCreatePROutput = {
  success: boolean;
  data?: {
    prUrl: string;
  };
  error?: string;
};

// ============================================================================
// MCP Handlers
// ============================================================================

type McpGetStatusInput = {
  cwd: string;
};
type McpGetStatusOutput = {
  success: boolean;
  error?: string;
  data: {
    servers: Record<
      string,
      {
        status: string;
        error?: string;
        toolCount: number;
        tools: string[];
      }
    >;
    configs: Record<string, McpServerConfig>;
    globalConfigPath: string;
    projectConfigPath: string;
    isReady: boolean;
    isLoading: boolean;
  };
};

type McpReconnectInput = {
  cwd: string;
  serverName: string;
};
type McpReconnectOutput = {
  success: boolean;
  message?: string;
  error?: string;
};

type McpListInput = {
  cwd: string;
};
type McpListOutput = {
  success: boolean;
  data: {
    projectServers: Record<string, McpServerConfig>;
    globalServers: Record<string, McpServerConfig>;
    activeServers: Record<
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
    >;
    projectConfigPath: string;
    globalConfigPath: string;
    isReady: boolean;
    isLoading: boolean;
  };
};

// ============================================================================
// Models Handlers
// ============================================================================

type ModelsListInput = {
  cwd: string;
};
type ModelsListOutput = {
  success: boolean;
  data: {
    groupedModels: Array<{
      provider: string;
      providerId: string;
      isActive: boolean;
      models: Array<{
        name: string;
        modelId: string;
        value: string;
      }>;
    }>;
    currentModel: any;
    currentModelInfo: {
      providerName: string;
      modelName: string;
      modelId: string;
      modelContextLimit: number;
    } | null;
    nullModels: Array<{
      providerId: string;
      modelId: string;
    }>;
    recentModels: string[];
    thinkingLevel: string | undefined;
  };
};

type ModelsTestInput = {
  cwd?: string;
  model: string;
  timeout?: number; // Default 15000ms (15 seconds)
  prompt?: string; // Default 'hi'
};
type ModelsTestOutput =
  | {
      success: true;
      data: {
        model: string;
        provider: string;
        modelName: string;
        prompt: string;
        response: string;
        responseTime: number; // in milliseconds
        usage: {
          input_tokens: number;
          output_tokens: number;
        } | null;
      };
    }
  | {
      success: false;
      error: string;
    };

// ============================================================================
// Output Styles Handlers
// ============================================================================

type OutputStylesListInput = {
  cwd: string;
};
type OutputStylesListOutput = {
  success: boolean;
  data: {
    outputStyles: Array<{
      name: string;
      description: string;
    }>;
    currentOutputStyle: any;
  };
};

// ============================================================================
// Project Handlers
// ============================================================================

type ProjectAddHistoryInput = {
  cwd: string;
  history: string;
};

type ProjectClearContextInput = {
  cwd?: string;
};

type ProjectAddMemoryInput = {
  cwd: string;
  global: boolean;
  rule: string;
};

type ProjectAnalyzeContextInput = {
  cwd: string;
  sessionId: string;
};
type ProjectAnalyzeContextOutput = {
  success: boolean;
  error?: string;
  data?: {
    systemPrompt: { tokens: number; percentage: number };
    systemTools: { tokens: number; percentage: number };
    mcpTools: { tokens: number; percentage: number };
    messages: { tokens: number; percentage: number };
    freeSpace: { tokens: number; percentage: number };
    totalContextWindow: number;
  };
};

type ProjectGetRepoInfoInput = {
  cwd: string;
};
type ProjectGetRepoInfoOutput = {
  success: boolean;
  error?: string;
  data?: {
    repoData: {
      path: string;
      name: string;
      workspaceIds: string[];
      metadata: {
        lastAccessed: number;
        settings: any;
      };
      gitRemote?: {
        originUrl: string | null;
        defaultBranch: string | null;
      };
    };
    timings?: Record<string, number>;
  };
};

type WorkspaceData = {
  id: string;
  repoPath: string;
  branch: string;
  worktreePath: string;
  sessionIds: string[];
  gitState: {
    currentCommit: string;
    isDirty: boolean;
    pendingChanges: string[];
  };
  metadata: {
    createdAt: number;
    description: string;
    status: 'active' | 'archived' | 'stale';
  };
  context: {
    activeFiles: string[];
    settings: any;
    preferences: Record<string, unknown>;
  };
};

type ProjectWorkspacesListInput = {
  cwd: string;
};
type ProjectWorkspacesListOutput = {
  success: boolean;
  error?: string;
  data?: { workspaces: WorkspaceData[] };
};

type ProjectWorkspacesGetInput = {
  cwd: string;
  workspaceId: string;
};
type ProjectWorkspacesGetOutput = {
  success: boolean;
  error?: string;
  data?: WorkspaceData;
};

type ProjectWorkspacesCreateInput = {
  cwd: string;
  name?: string;
  skipUpdate?: boolean;
};
type ProjectWorkspacesCreateOutput = {
  success: boolean;
  error?: string;
  data?: {
    workspace: {
      name: string;
      path: string;
      branch: string;
    };
  };
};

type ProjectWorkspacesDeleteInput = {
  cwd: string;
  name: string;
  force?: boolean;
};
type ProjectWorkspacesDeleteOutput = {
  success: boolean;
  error?: string;
};

type ProjectWorkspacesMergeInput = {
  cwd: string;
  name: string;
};
type ProjectWorkspacesMergeOutput = {
  success: boolean;
  error?: string;
};

type ProjectWorkspacesCreateGithubPRInput = {
  cwd: string;
  name: string;
  title?: string;
  description?: string;
  baseBranch?: string;
};
type ProjectWorkspacesCreateGithubPROutput = {
  success: boolean;
  error?: string;
  data?: { prUrl: string; prNumber: number };
};

type ProjectGenerateCommitInput = {
  cwd: string;
  language?: string; // defaults to 'English'
  systemPrompt?: string; // custom system prompt override
  model?: string; // passed to quickQuery
  diff?: string; // git diff, fetched if not provided
  fileList?: string; // staged file list, fetched if not provided
};

type ProjectGenerateCommitOutput = {
  success: boolean;
  error?: string;
  data?: {
    commitMessage: string;
    branchName: string;
    isBreakingChange: boolean;
    summary: string;
  };
};

type ProjectsListInput = {
  cwd: string;
  includeSessionDetails?: boolean;
};

type ProjectsListOutput = {
  success: boolean;
  error?: string;
  data?: {
    projects: Array<{
      path: string;
      lastAccessed: number | null;
      sessionCount: number;
      sessions?: Array<{
        sessionId: string;
        modified: Date;
        created: Date;
        messageCount: number;
        summary: string;
      }>;
    }>;
  };
};

// ============================================================================
// Providers Handlers
// ============================================================================

type ProvidersListInput = {
  cwd: string;
};
type ProvidersListOutput = {
  success: boolean;
  data: {
    providers: Array<{
      id: string;
      name: string;
      doc?: string;
      env?: string[];
      apiEnv?: string[];
      api?: string;
      apiFormat?: 'anthropic' | 'openai' | 'responses';
      source?: 'built-in' | string;
      options?: {
        baseURL?: string;
        apiKey?: string;
        headers?: Record<string, string>;
        httpProxy?: string;
      };
      validEnvs: string[];
      hasApiKey: boolean;
      maskedApiKey?: string;
      apiKeyOrigin?: 'env' | 'config';
      apiKeyEnvName?: string;
      oauthUser?: string;
    }>;
  };
};

type ProvidersLoginInitOAuthInput = {
  cwd: string;
  providerId: 'github-copilot' | 'qwen' | 'codex';
  timeout?: number;
};
type ProvidersLoginInitOAuthOutput =
  | {
      success: true;
      data: {
        authUrl: string;
        userCode?: string;
        oauthSessionId: string;
      };
    }
  | { success: false; error: string };

type ProvidersLoginCompleteOAuthInput = {
  cwd: string;
  providerId: 'github-copilot' | 'qwen' | 'codex';
  oauthSessionId: string;
  code: string;
};
type ProvidersLoginCompleteOAuthOutput =
  | {
      success: true;
      data: { user?: string };
    }
  | { success: false; error: string };

type ProvidersLoginStatusInput = {
  cwd: string;
  providerId: string;
};
type ProvidersLoginStatusOutput = {
  success: true;
  data: { isLoggedIn: boolean; user?: string };
};

type ProvidersLoginPollOAuthInput = {
  cwd: string;
  oauthSessionId: string;
};
type ProvidersLoginPollOAuthOutput =
  | {
      success: true;
      data: {
        status: 'pending' | 'completed' | 'error';
        user?: string;
        error?: string;
      };
    }
  | { success: false; error: string };

// ============================================================================
// Session Handlers
// ============================================================================

type SessionInitializeInput = {
  cwd: string;
  sessionId?: string;
};
type SessionInitializeOutput = {
  success: boolean;
  error?: any;
  data: {
    productName: string;
    productASCIIArt: string | undefined;
    version: string;
    model: any;
    planModel: string | undefined;
    initializeModelError: string | null;
    providers: any;
    approvalMode: ApprovalMode;
    sessionSummary: string | undefined;
    pastedTextMap: Record<string, string>;
    pastedImageMap: Record<string, string>;
    thinkingLevel: string | undefined;
  };
};

type SessionMessagesListInput = {
  cwd: string;
  sessionId: string;
};
type SessionMessagesListOutput = {
  success: boolean;
  data: {
    messages: NormalizedMessage[];
  };
};

type SessionExportSessionMarkdownInput = {
  cwd: string;
  sessionId: string | undefined;
};

type SessionExportSessionMarkdownOutput =
  | {
      success: true;
      data: {
        filePath: string;
      };
    }
  | {
      success: false;
      error: string;
    };

type SessionGetModelInput = {
  cwd: string;
  sessionId: string;
  includeModelInfo?: boolean;
};
type SessionGetModelOutput =
  | {
      success: true;
      data: {
        model: string | null;
      };
    }
  | {
      success: true;
      data: {
        model: string | null;
        modelInfo: ModelInfo | null;
        providers: ProvidersMap;
      };
    }
  | {
      success: false;
      error: any;
    };

type SessionSendInput = {
  message: string | null;
  cwd: string;
  sessionId: string | undefined;
  planMode: boolean;
  model?: string;
  attachments?: ImagePart[];
  parentUuid?: string;
  thinking?: ThinkingConfig;
};
type SessionSendOutput = any;

type SessionCancelInput = {
  cwd: string;
  sessionId: string;
};

type SessionAddMessagesInput = {
  cwd: string;
  sessionId: string;
  messages: Message[];
  parentUuid?: string;
};

type SessionCompactInput = {
  cwd: string;
  sessionId: string;
  messages: NormalizedMessage[];
};
type SessionCompactOutput = {
  success: boolean;
  data: {
    summary: string;
  };
};

type SessionConfigSetApprovalModeInput = {
  cwd: string;
  sessionId: string;
  approvalMode: ApprovalMode;
};

type SessionConfigAddApprovalToolsInput = {
  cwd: string;
  sessionId: string;
  approvalTool: string;
};

type SessionConfigSetSummaryInput = {
  cwd: string;
  sessionId: string;
  summary: string;
};

type SessionConfigSetPastedTextMapInput = {
  cwd: string;
  sessionId: string;
  pastedTextMap: Record<string, string>;
};

type SessionConfigSetPastedImageMapInput = {
  cwd: string;
  sessionId: string;
  pastedImageMap: Record<string, string>;
};

type SessionConfigGetAdditionalDirectoriesInput = {
  cwd: string;
  sessionId: string;
};
type SessionConfigGetAdditionalDirectoriesOutput = {
  success: boolean;
  data: {
    directories: string[];
  };
};

type SessionConfigAddDirectoryInput = {
  cwd: string;
  sessionId: string;
  directory: string;
};

type SessionConfigRemoveDirectoryInput = {
  cwd: string;
  sessionId: string;
  directory: string;
};

type SessionConfigSetInput = {
  cwd: string;
  sessionId: string;
  key: string;
  value: any;
};

type SessionConfigGetInput = {
  cwd: string;
  sessionId: string;
  key?: string;
};
type SessionConfigGetOutput = {
  success: boolean;
  data: {
    value: any;
  };
};

type SessionConfigRemoveInput = {
  cwd: string;
  sessionId: string;
  key: string;
};

type SessionsRemoveInput = {
  cwd: string;
  sessionId: string;
};

type SessionsRemoveOutput = {
  success: boolean;
  error?: string;
};

// ============================================================================
// Sessions Handlers
// ============================================================================

type SessionsListInput = {
  cwd: string;
};
type SessionsListOutput = {
  success: boolean;
  data: {
    sessions: Array<{
      sessionId: string;
      modified: Date;
      created: Date;
      messageCount: number;
      summary: string;
    }>;
  };
};

type SessionsResumeInput = {
  cwd: string;
  sessionId: string;
};
type SessionsResumeOutput = {
  success: boolean;
  data: {
    sessionId: string;
    logFile: string;
  };
};

// ============================================================================
// Skills Handlers
// ============================================================================

/** Skill source types */
type SkillSourceType =
  | 'plugin'
  | 'config'
  | 'global-claude'
  | 'global'
  | 'project-claude'
  | 'project';

type SkillsListInput = {
  cwd: string;
};
type SkillsListOutput = {
  success: boolean;
  data: {
    skills: Array<{
      name: string;
      description: string;
      path: string;
      source: SkillSourceType;
    }>;
    errors: Array<{ path: string; message: string }>;
  };
};

type SkillsGetInput = {
  cwd: string;
  name: string;
};
type SkillsGetOutput =
  | {
      success: true;
      data: {
        skill: {
          name: string;
          description: string;
          path: string;
          source: SkillSourceType;
          body: string;
        };
      };
    }
  | {
      success: false;
      error: string;
    };

type SkillsAddInput = {
  cwd: string;
  source: string;
  global?: boolean;
  claude?: boolean;
  overwrite?: boolean;
  name?: string;
  targetDir?: string;
};
type SkillsAddOutput =
  | {
      success: true;
      data: {
        installed: Array<{
          name: string;
          description: string;
          path: string;
          source: SkillSourceType;
        }>;
        skipped: Array<{ name: string; reason: string }>;
        errors: Array<{ path: string; message: string }>;
      };
    }
  | {
      success: false;
      error: string;
    };

type SkillsRemoveInput = {
  cwd: string;
  name: string;
  targetDir?: string;
};
type SkillsRemoveOutput = {
  success: boolean;
  error?: string;
};

type SkillsPreviewInput = {
  cwd: string;
  source: string;
};
type SkillsPreviewOutput =
  | {
      success: true;
      data: {
        previewId: string;
        skills: Array<{
          name: string;
          description: string;
          skillPath: string;
        }>;
        errors: Array<{ path: string; message: string }>;
      };
    }
  | {
      success: false;
      error: string;
    };

type SkillsInstallInput = {
  cwd: string;
  previewId: string;
  selectedSkills: string[];
  source: string;
  global?: boolean;
  claude?: boolean;
  overwrite?: boolean;
  name?: string;
  targetDir?: string;
};
type SkillsInstallOutput =
  | {
      success: true;
      data: {
        installed: Array<{
          name: string;
          description: string;
          path: string;
          source: SkillSourceType;
        }>;
        skipped: Array<{ name: string; reason: string }>;
        errors: Array<{ path: string; message: string }>;
      };
    }
  | {
      success: false;
      error: string;
    };

// ============================================================================
// Slash Command Handlers
// ============================================================================

type SlashCommandListInput = {
  cwd: string;
};
type SlashCommandListOutput = {
  success: boolean;
  data: {
    slashCommands: any[];
  };
};

type SlashCommandGetInput = {
  cwd: string;
  command: string;
};
type SlashCommandGetOutput = {
  success: boolean;
  data: {
    commandEntry: any;
  };
};

type SlashCommandExecuteInput = {
  cwd: string;
  sessionId: string;
  command: string;
  args: string;
};
type SlashCommandExecuteOutput = {
  success: boolean;
  data: {
    messages: any[];
  };
};

// ============================================================================
// Status Handlers
// ============================================================================

type StatusGetInput = {
  cwd: string;
  sessionId: string;
};
type StatusGetOutput = {
  success: boolean;
  data: {
    status: Record<
      string,
      {
        description?: string;
        items: string[];
      }
    >;
  };
};

// ============================================================================
// Utils Handlers
// ============================================================================

type UtilsQueryInput = {
  userPrompt: string;
  cwd: string;
  systemPrompt?: string;
  model?: string;
  thinking?: ThinkingConfig;
  responseFormat?: ResponseFormat;
};
type UtilsQueryOutput = any;

type UtilsQuickQueryInput = {
  userPrompt: string;
  cwd: string;
  systemPrompt?: string;
  model?: string;
  thinking?: ThinkingConfig;
  responseFormat?: ResponseFormat;
};
type UtilsQuickQueryOutput = any;

type UtilsSummarizeMessageInput = {
  message: string;
  cwd: string;
  model?: string;
};
type UtilsSummarizeMessageOutput = any;

type UtilsGetPathsInput = {
  cwd: string;
  maxFiles?: number;
};
type UtilsGetPathsOutput = {
  success: boolean;
  data: {
    paths: string[];
  };
};

type UtilsSearchPathsInput = {
  cwd: string;
  query: string;
  maxResults?: number;
};
type UtilsSearchPathsOutput = {
  success: boolean;
  data: {
    paths: string[];
    truncated: boolean;
  };
};

type UtilsTelemetryInput = {
  cwd: string;
  name: string;
  payload: Record<string, any>;
};

type UtilsFilesListInput = {
  cwd: string;
  query?: string;
};
type UtilsFilesListOutput = {
  success: boolean;
  data: {
    files: any[];
  };
};

type UtilsToolExecuteBashInput = {
  cwd: string;
  command: string;
};
type UtilsToolExecuteBashOutput = {
  success: boolean;
  data?: any;
  error?: { message: string };
};

/** Supported application types for open and detect operations */
export type App =
  | 'cursor'
  | 'vscode'
  | 'vscode-insiders'
  | 'zed'
  | 'windsurf'
  | 'iterm'
  | 'warp'
  | 'terminal'
  | 'antigravity'
  | 'finder'
  | 'sourcetree'
  | 'fork';

type UtilsOpenInput = {
  cwd: string;
  sessionId?: string;
  app: App;
};

type UtilsDetectAppsInput = {
  cwd: string;
  apps?: App[]; // if omitted, detect all
};

type UtilsDetectAppsOutput = {
  success: boolean;
  data: {
    apps: App[]; // list of installed apps
  };
};

type UtilsPlaySoundInput = {
  sound: string; // Sound name (e.g., 'Glass', 'Hero') or preset ('success', 'error', 'warning', 'info', 'done')
  volume?: number; // Volume level 0.0 to 1.0, defaults to 1.0
};

type UtilsPlaySoundOutput = SuccessResponse | ErrorResponse;

type UtilsNotifyInput = {
  cwd: string;
  config: string | false | undefined;
};

type UtilsNotifyOutput = SuccessResponse;

// ============================================================================
// Snapshot Handlers
// ============================================================================

type SnapshotPreview = {
  messageId: string;
  timestamp: Date;
  fileCount: number;
  changes?: {
    insertions: number;
    deletions: number;
    filesChanged: number;
  };
};

type RewindResult = {
  success: boolean;
  error?: string;
  filesChanged: string[];
  insertions: number;
  deletions: number;
};

type SerializedSnapshot = {
  messageId: string;
  timestamp: string;
  trackedFileBackups: Record<
    string,
    {
      backupFileName: string | null;
      version: number;
      backupTime: string;
    }
  >;
};

type SnapshotTrackFileInput = {
  cwd: string;
  sessionId: string;
  filePath: string; // Can be absolute or relative path
  isNewFile?: boolean; // True if the file does not exist yet (will be created)
};

type SnapshotCreateInput = {
  cwd: string;
  sessionId: string;
  messageId: string; // UUID of the message to associate with this snapshot
  description?: string;
};
type SnapshotCreateOutput = {
  success: boolean;
  data: {
    snapshot: SnapshotPreview | null;
  };
};

type SnapshotListInput = {
  cwd: string;
  sessionId: string;
};
type SnapshotListOutput = {
  success: boolean;
  data: {
    snapshots: SnapshotPreview[];
  };
};

type SnapshotHasInput = {
  cwd: string;
  sessionId: string;
  messageId: string;
};
type SnapshotHasOutput = {
  success: boolean;
  data: {
    hasSnapshot: boolean;
  };
};

type SnapshotRewindInput = {
  cwd: string;
  sessionId: string;
  messageId: string;
};
type SnapshotRewindOutput =
  | {
      success: true;
      data: {
        result: RewindResult;
      };
    }
  | {
      success: false;
      error: string;
    };

type SnapshotPreviewRewindInput = {
  cwd: string;
  sessionId: string;
  messageId: string;
  cumulative?: boolean;
};
type SnapshotPreviewRewindOutput =
  | {
      success: true;
      data: {
        result: RewindResult;
      };
    }
  | {
      success: false;
      error: string;
    };

type SnapshotLoadFromSessionInput = {
  cwd: string;
  sessionId: string;
  snapshots: SerializedSnapshot[];
};

// ============================================================================
// UI Bridge Handlers (from uiBridge.ts)
// ============================================================================

type ToolApprovalInput = {
  toolUse: ToolUse;
  category?: ApprovalCategory;
  sessionId: string;
};

type ToolApprovalOutput = {
  approved: boolean;
  params?: Record<string, unknown>;
  denyReason?: string;
};

// ============================================================================
// Handler Map - Central Type Registry
// ============================================================================

/**
 * Central type registry for all message bus handlers.
 * Maps handler method names to their input and output types.
 */
export type HandlerMap = {
  // GlobalData handlers
  'globalData.recentModels.get': {
    input: GlobalDataRecentModelsGetInput;
    output: GlobalDataRecentModelsGetOutput;
  };
  'globalData.recentModels.add': {
    input: GlobalDataRecentModelsAddInput;
    output: SuccessResponse;
  };

  // Config handlers
  'config.get': { input: ConfigGetInput; output: ConfigGetOutput };
  'config.set': { input: ConfigSetInput; output: SuccessResponse };
  'config.remove': { input: ConfigRemoveInput; output: SuccessResponse };
  'config.list': { input: ConfigListInput; output: ConfigListOutput };

  // Git handlers
  'git.clone': { input: GitCloneInput; output: GitCloneOutput };
  'git.clone.cancel': { input: { taskId: string }; output: SuccessResponse };
  'git.status': { input: GitStatusInput; output: GitStatusOutput };
  'git.stage': {
    input: GitStageInput;
    output: SuccessResponse | ErrorResponse;
  };
  'git.commit': {
    input: GitCommitInput;
    output: SuccessResponse | ErrorResponse;
  };
  'git.push': { input: GitPushInput; output: SuccessResponse | ErrorResponse };
  'git.createBranch': {
    input: GitCreateBranchInput;
    output: GitCreateBranchOutput;
  };
  'git.detectGitHub': {
    input: GitDetectGitHubInput;
    output: GitDetectGitHubOutput;
  };
  'git.createPR': {
    input: GitCreatePRInput;
    output: GitCreatePROutput;
  };

  // MCP handlers
  'mcp.getStatus': { input: McpGetStatusInput; output: McpGetStatusOutput };
  'mcp.reconnect': { input: McpReconnectInput; output: McpReconnectOutput };
  'mcp.list': { input: McpListInput; output: McpListOutput };

  // Models handlers
  'models.list': { input: ModelsListInput; output: ModelsListOutput };
  'models.test': { input: ModelsTestInput; output: ModelsTestOutput };

  // Output styles handlers
  'outputStyles.list': {
    input: OutputStylesListInput;
    output: OutputStylesListOutput;
  };

  // Project handlers
  'project.addHistory': {
    input: ProjectAddHistoryInput;
    output: SuccessResponse;
  };
  'project.clearContext': {
    input: ProjectClearContextInput;
    output: SuccessResponse;
  };
  'project.addMemory': {
    input: ProjectAddMemoryInput;
    output: SuccessResponse;
  };
  'project.analyzeContext': {
    input: ProjectAnalyzeContextInput;
    output: ProjectAnalyzeContextOutput;
  };
  'project.getRepoInfo': {
    input: ProjectGetRepoInfoInput;
    output: ProjectGetRepoInfoOutput;
  };
  'project.workspaces.list': {
    input: ProjectWorkspacesListInput;
    output: ProjectWorkspacesListOutput;
  };
  'project.workspaces.get': {
    input: ProjectWorkspacesGetInput;
    output: ProjectWorkspacesGetOutput;
  };
  'project.workspaces.create': {
    input: ProjectWorkspacesCreateInput;
    output: ProjectWorkspacesCreateOutput;
  };
  'project.workspaces.delete': {
    input: ProjectWorkspacesDeleteInput;
    output: ProjectWorkspacesDeleteOutput;
  };
  'project.workspaces.merge': {
    input: ProjectWorkspacesMergeInput;
    output: ProjectWorkspacesMergeOutput;
  };
  'project.workspaces.createGithubPR': {
    input: ProjectWorkspacesCreateGithubPRInput;
    output: ProjectWorkspacesCreateGithubPROutput;
  };
  'project.generateCommit': {
    input: ProjectGenerateCommitInput;
    output: ProjectGenerateCommitOutput;
  };

  // Projects handlers
  'projects.list': {
    input: ProjectsListInput;
    output: ProjectsListOutput;
  };

  // Providers handlers
  'providers.list': { input: ProvidersListInput; output: ProvidersListOutput };
  'providers.login.initOAuth': {
    input: ProvidersLoginInitOAuthInput;
    output: ProvidersLoginInitOAuthOutput;
  };
  'providers.login.completeOAuth': {
    input: ProvidersLoginCompleteOAuthInput;
    output: ProvidersLoginCompleteOAuthOutput;
  };
  'providers.login.status': {
    input: ProvidersLoginStatusInput;
    output: ProvidersLoginStatusOutput;
  };
  'providers.login.pollOAuth': {
    input: ProvidersLoginPollOAuthInput;
    output: ProvidersLoginPollOAuthOutput;
  };

  // Session handlers
  'session.initialize': {
    input: SessionInitializeInput;
    output: SessionInitializeOutput;
  };
  'session.messages.list': {
    input: SessionMessagesListInput;
    output: SessionMessagesListOutput;
  };
  'session.export': {
    input: SessionExportSessionMarkdownInput;
    output: SessionExportSessionMarkdownOutput;
  };
  'session.getModel': {
    input: SessionGetModelInput;
    output: SessionGetModelOutput;
  };
  'session.send': { input: SessionSendInput; output: SessionSendOutput };
  'session.cancel': { input: SessionCancelInput; output: SuccessResponse };
  'session.addMessages': {
    input: SessionAddMessagesInput;
    output: SuccessResponse;
  };
  'session.compact': {
    input: SessionCompactInput;
    output: SessionCompactOutput;
  };
  'session.config.setApprovalMode': {
    input: SessionConfigSetApprovalModeInput;
    output: SuccessResponse;
  };
  'session.config.addApprovalTools': {
    input: SessionConfigAddApprovalToolsInput;
    output: SuccessResponse;
  };
  'session.config.setSummary': {
    input: SessionConfigSetSummaryInput;
    output: SuccessResponse;
  };
  'session.config.setPastedTextMap': {
    input: SessionConfigSetPastedTextMapInput;
    output: SuccessResponse;
  };
  'session.config.setPastedImageMap': {
    input: SessionConfigSetPastedImageMapInput;
    output: SuccessResponse;
  };
  'session.config.getAdditionalDirectories': {
    input: SessionConfigGetAdditionalDirectoriesInput;
    output: SessionConfigGetAdditionalDirectoriesOutput;
  };
  'session.config.addDirectory': {
    input: SessionConfigAddDirectoryInput;
    output: SuccessResponse;
  };
  'session.config.removeDirectory': {
    input: SessionConfigRemoveDirectoryInput;
    output: SuccessResponse;
  };
  'session.config.set': {
    input: SessionConfigSetInput;
    output: SuccessResponse;
  };
  'session.config.get': {
    input: SessionConfigGetInput;
    output: SessionConfigGetOutput;
  };
  'session.config.remove': {
    input: SessionConfigRemoveInput;
    output: SuccessResponse;
  };
  'sessions.remove': {
    input: SessionsRemoveInput;
    output: SessionsRemoveOutput;
  };

  // Sessions handlers
  'sessions.list': { input: SessionsListInput; output: SessionsListOutput };
  'sessions.resume': {
    input: SessionsResumeInput;
    output: SessionsResumeOutput;
  };

  // Skills handlers
  'skills.list': { input: SkillsListInput; output: SkillsListOutput };
  'skills.get': { input: SkillsGetInput; output: SkillsGetOutput };
  'skills.add': { input: SkillsAddInput; output: SkillsAddOutput };
  'skills.remove': { input: SkillsRemoveInput; output: SkillsRemoveOutput };
  'skills.preview': { input: SkillsPreviewInput; output: SkillsPreviewOutput };
  'skills.install': { input: SkillsInstallInput; output: SkillsInstallOutput };

  // Slash command handlers
  'slashCommand.list': {
    input: SlashCommandListInput;
    output: SlashCommandListOutput;
  };
  'slashCommand.get': {
    input: SlashCommandGetInput;
    output: SlashCommandGetOutput;
  };
  'slashCommand.execute': {
    input: SlashCommandExecuteInput;
    output: SlashCommandExecuteOutput;
  };

  // Status handlers
  'status.get': { input: StatusGetInput; output: StatusGetOutput };

  // Utils handlers
  'utils.query': { input: UtilsQueryInput; output: UtilsQueryOutput };
  'utils.quickQuery': {
    input: UtilsQuickQueryInput;
    output: UtilsQuickQueryOutput;
  };
  'utils.summarizeMessage': {
    input: UtilsSummarizeMessageInput;
    output: UtilsSummarizeMessageOutput;
  };
  'utils.getPaths': { input: UtilsGetPathsInput; output: UtilsGetPathsOutput };
  'utils.searchPaths': {
    input: UtilsSearchPathsInput;
    output: UtilsSearchPathsOutput;
  };
  'utils.telemetry': { input: UtilsTelemetryInput; output: SuccessResponse };
  'utils.files.list': {
    input: UtilsFilesListInput;
    output: UtilsFilesListOutput;
  };
  'utils.tool.executeBash': {
    input: UtilsToolExecuteBashInput;
    output: UtilsToolExecuteBashOutput;
  };
  'utils.open': { input: UtilsOpenInput; output: SuccessResponse };
  'utils.detectApps': {
    input: UtilsDetectAppsInput;
    output: UtilsDetectAppsOutput;
  };
  'utils.playSound': {
    input: UtilsPlaySoundInput;
    output: UtilsPlaySoundOutput;
  };
  'utils.notify': {
    input: UtilsNotifyInput;
    output: UtilsNotifyOutput;
  };

  // UI Bridge handlers
  toolApproval: { input: ToolApprovalInput; output: ToolApprovalOutput };

  // Snapshot handlers
  'snapshot.trackFile': {
    input: SnapshotTrackFileInput;
    output: SuccessResponse;
  };
  'snapshot.create': {
    input: SnapshotCreateInput;
    output: SnapshotCreateOutput;
  };
  'snapshot.list': {
    input: SnapshotListInput;
    output: SnapshotListOutput;
  };
  'snapshot.has': {
    input: SnapshotHasInput;
    output: SnapshotHasOutput;
  };
  'snapshot.rewind': {
    input: SnapshotRewindInput;
    output: SnapshotRewindOutput;
  };
  'snapshot.previewRewind': {
    input: SnapshotPreviewRewindInput;
    output: SnapshotPreviewRewindOutput;
  };
  'snapshot.loadFromSession': {
    input: SnapshotLoadFromSessionInput;
    output: SuccessResponse;
  };
};

// ============================================================================
// Helper Types
// ============================================================================

/** Extract input type for a given handler method */
export type HandlerInput<K extends keyof HandlerMap> = HandlerMap[K]['input'];

/** Extract output type for a given handler method */
export type HandlerOutput<K extends keyof HandlerMap> = HandlerMap[K]['output'];

/** All valid handler method names */
export type HandlerMethod = keyof HandlerMap;

export type NodeBridgeHandlers = Partial<{
  [K in keyof HandlerMap]: (
    data: HandlerMap[K]['input'],
    context: import('./context').Context,
  ) => Promise<HandlerMap[K]['output']> | HandlerMap[K]['output'];
}>;
