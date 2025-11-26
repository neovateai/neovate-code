# Workspace Get Handler

**Date:** 2025-11-20

## Context

The browser UI needs to fetch individual workspace data efficiently. Currently, `project.getWorkspacesInfo` returns all workspaces, which is inefficient when only one workspace's data is needed. This design adds a `project.workspaces.get` handler that retrieves a single workspace by ID.

The handler serves two primary use cases:
- Fetching single workspace details on-demand (performance optimization vs fetching all)
- Refreshing a specific workspace's state after operations

Additionally, this design renames `project.getWorkspacesInfo` to `project.workspaces.list` for consistency with other workspace operation handlers (create, delete, merge, createGithubPR).

## Discussion

### Approach Evaluation

Three approaches were considered:

**Approach 1: Shared Helper Function (Selected)**
- Extract workspace data building logic into reusable `buildWorkspaceData()` helper
- Both list and get handlers call the same helper
- Single source of truth for WorkspaceData construction
- Requires refactoring existing handler but ensures consistency

**Approach 2: Standalone Implementation**
- Duplicate workspace building logic
- No refactoring needed but creates code duplication
- Two places to maintain when WorkspaceData structure changes

**Approach 3: Filter Wrapper**
- Call `project.workspaces.list` internally, filter to requested workspace
- Simple but defeats performance optimization purpose
- Computes all workspaces then discards results

Approach 1 was selected for the best balance of performance, maintainability, and code quality.

### Key Decisions

- **Shared Helper:** Extract logic to avoid duplication and ensure consistency
- **Naming Convention:** Rename to `project.workspaces.list` to match existing workspace operation naming pattern
- **Breaking Change:** Handler rename requires coordinated browser UI update (no backward compatibility layer needed for internal API)

## Approach

Refactor workspace data retrieval into a shared pattern:

1. Create `buildWorkspaceData(worktree, context)` helper function that encapsulates all logic for constructing a single WorkspaceData object
2. Rename existing handler: `project.getWorkspacesInfo` → `project.workspaces.list`
3. Refactor `project.workspaces.list` to use the helper
4. Implement new `project.workspaces.get` handler that finds a specific worktree and uses the helper

Both handlers share the same data building logic, ensuring consistency while allowing efficient single-workspace retrieval.

## Architecture

### Handler Signatures

```typescript
'project.workspaces.list': (data: { cwd: string }) => 
  Promise<{ success: true, data: { workspaces: WorkspaceData[] } }>

'project.workspaces.get': (data: { cwd: string, workspaceId: string }) => 
  Promise<{ success: true, data: WorkspaceData }>
```

### Data Flow

**project.workspaces.list:**
1. Validate git repository via `isGitRepository(cwd)`
2. Get git root via `getGitRoot(cwd)`
3. List all worktrees via `listWorktrees(gitRoot)`
4. Map each worktree through `buildWorkspaceData()` helper
5. Return array of WorkspaceData

**project.workspaces.get:**
1. Validate git repository via `isGitRepository(cwd)`
2. Get git root via `getGitRoot(cwd)`
3. List all worktrees via `listWorktrees(gitRoot)`
4. Find worktree matching `workspaceId`
5. If not found, return error
6. Call `buildWorkspaceData()` helper for the single worktree
7. Return single WorkspaceData object

### buildWorkspaceData Helper Function

**Location:** Inside `NodeHandlerRegistry` class as a private method

**Responsibilities:**
- Extract git state (currentCommit, isDirty, pendingChanges)
- Retrieve sessions via `Paths.getAllSessions(worktree.path)`
- Compute creation timestamp from filesystem stats
- Derive status from git state and age
- Extract active files (empty array for now, future enhancement)
- Gather worktree-level settings from config

**Input Parameters:**
- `worktree`: Worktree object from `listWorktrees()`
- `context`: Context object for paths and config access

**Output:** Complete `WorkspaceData` object matching the interface from `2025-11-18-project-info-handlers.md`

### Error Handling

All errors return `{ success: false, error: string }` for consistency with existing handlers.

**Specific Error Cases:**

`project.workspaces.get`:
- Workspace ID not found → `"Workspace '{workspaceId}' not found"`
- Not a git repository → `"Not a git repository"`

**Partial Data Strategy:**
- If git commands fail (e.g., getCurrentCommit), use sensible defaults:
  - currentCommit: empty string
  - isDirty: false
  - pendingChanges: empty array
- If filesystem stats unavailable: use `Date.now()` for createdAt
- Sessions always retrievable via Paths (no failure case)

### Implementation Steps

1. Extract `buildWorkspaceData` helper from existing `project.getWorkspacesInfo` handler
2. Register new `project.workspaces.get` handler using the helper
3. Rename `project.getWorkspacesInfo` to `project.workspaces.list` and refactor to use helper
4. Update browser API calls from `project.getWorkspacesInfo` to `project.workspaces.list`
5. Test all scenarios
6. Verify no regressions in existing workspace operations

**Files to Modify:**
- `src/nodeBridge.ts` - Handler implementation and rename
- `browser/src/api/project.ts` - Update API call name (if exists)
- Any browser components calling the old handler name

### Testing Approach

Manual testing via browser UI:
1. Test `project.workspaces.list` returns all workspaces correctly
2. Test `project.workspaces.get` with valid workspace ID
3. Test `project.workspaces.get` with invalid workspace ID (error case)
4. Test both handlers in non-git directory (error case)
5. Verify data consistency between list and get for same workspace

### Migration Notes

The rename from `project.getWorkspacesInfo` to `project.workspaces.list` is a breaking change for the browser UI. Requires synchronized deployment:
1. Update handler in nodeBridge.ts
2. Update browser API calls to use new name
3. No backward compatibility layer needed (internal API)

**No Breaking Changes For:**
- Existing workspace CRUD operations (create, delete, merge, createGithubPR)
- WorkspaceData structure remains identical
- Only the handler name changes
