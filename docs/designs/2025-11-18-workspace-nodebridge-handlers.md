# Workspace NodeBridge Handlers

**Date:** 2025-11-18

## Context

The workspace management functionality currently exists only in the CLI (`src/commands/workspace.ts`) using worktree methods from `src/worktree.ts`. To support workspace operations in the browser UI, we need to expose these capabilities through the nodeBridge message bus system.

The goal is to add handlers for creating, deleting, merging workspaces, and creating GitHub PRs, making these operations accessible to the browser UI through the existing nodeBridge architecture.

## Discussion

### Parameter Handling Strategy

The key architectural decision was whether handlers should:
- A) Require all parameters explicitly (UI does selection/prompting)
- B) Support auto-selection logic like CLI (handler prompts when needed)
- C) Different approach per operation

**Decision: Approach A** - Browser UI will handle all interactive selection and prompting, handlers require explicit parameters. This maintains clear separation between presentation (UI) and business logic (handlers).

### Implementation Approach

Three approaches were explored:

1. **Direct Worktree Method Mapping** - Each handler directly calls worktree.ts methods with minimal wrapper logic
2. **Reuse Command Layer Logic** - Import and adapt workspace command functions, requiring refactoring of CLI code
3. **Hybrid** - Direct calls with enhanced validation and state management

**Decision: Direct Worktree Method Mapping** - Simplest approach that maintains handler independence, avoids CLI-specific concerns, and keeps nodeBridge focused on protocol adaptation rather than business logic duplication.

## Approach

Add four new message bus handlers to `src/nodeBridge.ts`:

1. **`project.workspaces.create`** - Create new workspace worktree
2. **`project.workspaces.delete`** - Delete workspace without merging
3. **`project.workspaces.merge`** - Merge workspace back and cleanup
4. **`project.workspaces.createGithubPR`** - Push branch and create GitHub PR

All handlers follow the existing nodeBridge pattern:
- Direct calls to `worktree.ts` methods
- Standard error handling with try-catch
- Consistent response format: `{ success: boolean, data?: any, error?: string }`
- UI provides all parameters explicitly

## Architecture

### Handler Signatures

#### `project.workspaces.create`

**Request:**
```typescript
{
  cwd: string;
  name?: string;           // Optional: random city name if not provided
  skipUpdate?: boolean;    // Skip updating main branch (default: false)
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    workspace: {
      name: string;
      path: string;
      branch: string;
    }
  };
  error?: string;
}
```

**Implementation Flow:**
1. Get context and validate git repository (`isGitRepository`)
2. Get git root (`getGitRoot`)
3. Detect main branch (`detectMainBranch`)
4. Update main branch if not skipped (`updateMainBranch`)
5. Generate or use provided workspace name (`generateWorkspaceName`)
6. Create worktree with base branch (`createWorktree`)
7. Add workspaces directory to git exclude (`addToGitExclude`)

#### `project.workspaces.delete`

**Request:**
```typescript
{
  cwd: string;
  name: string;            // Required: explicit workspace name
  force?: boolean;         // Delete even with uncommitted changes (default: false)
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Implementation Flow:**
1. Get context and validate git repository
2. Get git root
3. Delete worktree with optional force flag (`deleteWorktree`)

#### `project.workspaces.merge`

**Request:**
```typescript
{
  cwd: string;
  name: string;            // Required: explicit workspace name
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Implementation Flow:**
1. Get context and validate git repository
2. Get git root
3. List worktrees to find target workspace (`listWorktrees`)
4. Find workspace by name
5. Merge worktree back to original branch (`mergeWorktree`)

#### `project.workspaces.createGithubPR`

**Request:**
```typescript
{
  cwd: string;
  name: string;              // Required: workspace name
  title?: string;            // PR title (default: generated from branch)
  description?: string;      // PR description (default: empty)
  baseBranch?: string;       // Target branch (default: detected main branch)
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    prUrl: string;           // GitHub PR URL
    prNumber: number;        // PR number
  };
  error?: string;
}
```

**Implementation Flow:**
1. Get context and validate git repository
2. Get git root
3. List worktrees to find target workspace (`listWorktrees`)
4. Find workspace by name
5. Ensure workspace has no uncommitted changes (`ensureCleanWorkingDirectory`)
6. Push workspace branch to remote using bash (`git push origin <branch>`)
7. Detect base branch if not provided (`detectMainBranch`)
8. Create PR using GitHub CLI via bash (`gh pr create`)
9. Parse PR URL and number from output

### Error Handling

All handlers follow consistent error handling patterns:

**Common Errors:**
- Not in git repository → `{ success: false, error: "Not a git repository" }`
- Git operations fail → `{ success: false, error: <git error message> }`

**Create-specific:**
- Workspace name already exists
- Network error during main branch update
- No city names available (fallback to timestamp-based name)

**Delete-specific:**
- Workspace not found
- Uncommitted changes without force flag

**Merge-specific:**
- Workspace not found
- Merge conflicts
- Target branch checked out in non-existent worktree

**Create PR-specific:**
- Workspace not found
- Uncommitted changes
- GitHub CLI not installed/authenticated
- Branch already has PR

### Test Command Integration

Update `src/commands/__test.ts` to add four new test handlers:

```typescript
{
  label: 'Project: Create Workspace',
  handler: 'project.workspaces.create',
  getData: (cwd: string) => ({ cwd, name: 'test-workspace', skipUpdate: true }),
}
{
  label: 'Project: Delete Workspace',
  handler: 'project.workspaces.delete',
  getData: (cwd: string) => ({ cwd, name: 'test-workspace', force: false }),
}
{
  label: 'Project: Merge Workspace',
  handler: 'project.workspaces.merge',
  getData: (cwd: string) => ({ cwd, name: 'test-workspace' }),
}
{
  label: 'Project: Create GitHub PR',
  handler: 'project.workspaces.createGithubPR',
  getData: (cwd: string) => ({ 
    cwd, 
    name: 'test-workspace',
    title: 'Test PR',
    description: 'Test PR description'
  }),
}
```

This allows manual testing through the `__test` command's interactive UI.

### Implementation Notes

- All handlers use async/await pattern
- Handlers are registered in the existing `NodeHandlerRegistry.registerHandlers()` method
- Follows the same context management pattern as `project.getRepoInfo` and `project.getWorkspacesInfo`
- Uses existing worktree.ts methods without modification
- Error messages match CLI command patterns for consistency
- GitHub PR creation uses `gh` CLI via bash tool for simplicity
