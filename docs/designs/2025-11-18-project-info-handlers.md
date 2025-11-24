# Project Info Handlers for Browser UI

**Date:** 2025-11-18

## Context

The browser UI needs access to comprehensive project and workspace information. This requires adding new handlers to `nodeBridge.ts` that expose:
- Repository-level data (git remote, branches, workspace list)
- Detailed workspace data (git state, sessions, metadata)

The goal is to provide the browser with structured data about the current project's repositories and their associated workspaces (git worktrees), including session management and git synchronization status.

## Discussion

### Key Decisions

**Primary Use Case:** Browser UI consumption for displaying project/workspace information.

**Data Source Strategy:** All data computed on-the-fly from:
- Git commands (reusing `src/utils/git.ts` and `src/worktree.ts`)
- Filesystem stats
- Existing session and config files
- No new storage files needed

**Architecture Pattern:** Two separate handlers instead of one combined handler:
- Better flexibility - fetch only what's needed
- Progressive loading capability (show repo info first, workspaces later)
- Lighter API calls when partial data is sufficient

**Workspace-Session Relationship:** One workspace can have multiple sessions. Sessions are retrieved using `paths.getAllSessions()` for each workspace path.

**Git Information Scope:** Basic essential info only:
- Repo level: origin URL, default branch, sync status
- Workspace level: current commit, dirty state, pending changes list

**Metadata Handling:** No new storage files. Metadata fields like `description` remain empty, `preferences` remain empty objects. Status computed from git state.

## Approach

### Two Handler Design

**Handler 1: `project.getRepoInfo`**
- Input: `{ cwd: string }`
- Returns: `{ success: true, data: { repoData: RepoData } }`
- Provides repository-level overview with workspace list

**Handler 2: `project.workspaces.list`** (renamed from `project.getWorkspacesInfo`)
- Input: `{ cwd: string }`
- Returns: `{ success: true, data: { workspaces: WorkspaceData[] } }`
- Provides detailed information for all workspaces

This separation allows the browser to:
1. Quickly display repo info and workspace names
2. Progressively load detailed workspace data as needed
3. Refresh specific data independently

## Architecture

### Data Structures

**RepoData Interface:**
```typescript
export interface RepoData {
  path: string;              // Git root path
  name: string;              // Repository name (basename)
  workspaceIds: string[];    // List of workspace names
  metadata: {
    lastAccessed: number;    // From GlobalData (new field)
    settings?: Record<string, any>;  // Project-level config
  };
  gitRemote: {
    originUrl: string | null;        // Remote origin URL
    defaultBranch: string | null;    // Default branch name
    syncStatus: 'synced' | 'ahead' | 'behind' | 'diverged' | 'unknown';
  };
}
```

**WorkspaceData Interface:**
```typescript
export interface WorkspaceData {
  id: string;                // Workspace name
  repoPath: string;          // Git root path
  branch: string;            // Workspace branch
  worktreePath: string;      // Worktree directory path
  sessionIds: string[];      // Associated session IDs
  gitState: {
    currentCommit: string;        // HEAD commit hash
    isDirty: boolean;             // Has uncommitted changes
    pendingChanges: string[];     // List of modified files
  };
  metadata: {
    createdAt: number;            // Worktree creation timestamp
    description: string;          // Always "" (empty)
    status: 'active' | 'archived' | 'stale';  // Computed status
  };
  context: {
    activeFiles: string[];        // From latest session
    settings?: Record<string, any>;    // From worktree config
    preferences?: Record<string, any>; // Always {} (empty)
  };
}
```

### Implementation Flow

**project.getRepoInfo Handler:**
1. Get git root using `worktree.getGitRoot(cwd)`
2. Get remote URL using new `getGitRemoteUrl()` helper
3. Get default branch using new `getDefaultBranch()` helper
4. Calculate sync status using new `getGitSyncStatus()` helper
5. List workspace names using `worktree.listWorktrees()`
6. Get last accessed timestamp from GlobalData
7. Get project settings from config
8. Build and return RepoData object

**project.workspaces.list Handler:**
1. Get git root path
2. List all worktrees using `worktree.listWorktrees()`
3. For each worktree:
   - Get current commit using new `getCurrentCommit()` helper
   - Check if dirty (from worktree.isClean)
   - Get pending changes list using new `getPendingChanges()` helper
   - Get sessions using `paths.getAllSessions(worktreePath)`
   - Get creation timestamp from filesystem stats
   - Compute status from git state
   - Extract active files from latest session (if exists)
   - Get worktree-level settings from config
4. Build and return WorkspaceData[] array

### New Helper Functions

Add to `src/utils/git.ts`:

```typescript
// Get remote origin URL
export async function getGitRemoteUrl(cwd: string): Promise<string | null>

// Get default branch from remote  
export async function getDefaultBranch(cwd: string): Promise<string | null>

// Check sync status with remote
export async function getGitSyncStatus(cwd: string): Promise<'synced' | 'ahead' | 'behind' | 'diverged' | 'unknown'>

// Get current commit hash
export async function getCurrentCommit(cwd: string): Promise<string>

// Get list of pending changes
export async function getPendingChanges(cwd: string): Promise<string[]>
```

All functions use the existing `execGit()` pattern from the codebase.

### Error Handling

- Handlers return `{ success: false, error: string }` on critical failures
- Git command errors → return partial data with null/empty values where possible
- Non-git repositories → return error "Not a git repository"
- Missing worktrees → return empty arrays
- Network errors (fetch) → sync status becomes 'unknown'

### Handler Registration

- Add handlers in `nodeBridge.ts` after existing `project.*` handlers (~line 450)
- Use consistent pattern with other handlers (async, error handling)
- Leverage existing `getContext()` for paths and config access
- Create new Paths instance for each worktree when needed

### Data Sources Reference

- Git info: `src/utils/git.ts` and `src/worktree.ts`
- Sessions: `paths.getAllSessions()` from `src/paths.ts`
- Config: Context config and ConfigManager
- GlobalData: `src/globalData.ts` (extend for lastAccessed tracking)
