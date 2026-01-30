# Skill NodeBridge Handlers

**Date:** 2026-01-26

## Context

The project needed to expose skill management functionality through the NodeBridge message bus system. The existing `SkillManager` class in `src/skill.ts` and CLI command in `src/commands/skill.tsx` provided skill operations (list, get, add, remove, preview, install), but these were not accessible via the NodeBridge API used by external consumers like the web UI.

The goal was to add skill-related handlers to `src/nodeBridge.ts` following existing patterns, with full type safety via `src/nodeBridge.types.ts`.

## Discussion

### Operations Scope
**Question:** Which skill operations should be exposed?
**Decision:** All CRUD operations - full parity with CLI including the two-phase preview/install flow for interactive selection of skills from multi-skill repositories.

### Synchronous vs Async
**Question:** The `addSkill` operation clones from GitHub which can take time. Should handlers be synchronous or async with progress events?
**Decision:** Synchronous - the handler blocks until skill installation is complete. This keeps the API simpler; async with progress events can be added later if needed.

### Skill Body Content
**Question:** Should `skills.get` include the skill body (SKILL.md content) or just metadata?
**Decision:** Include body content - this makes the handler more useful for displaying skill details without requiring a separate call.

### Handler Naming
Three approaches were considered:
1. **Flat `skills.*`** - e.g., `skills.list`, `skills.get`
2. **Grouped `project.skills.*`** - e.g., `project.skills.list`
3. **Minimal handlers** - skip preview/install, just list/get/add/remove

**Decision:** Approach A (flat `skills.*`) - consistent with existing handlers like `sessions.list`, `models.list`. Skills can be global, so grouping under `project.*` was misleading.

## Approach

Add 6 handlers following the existing NodeBridge patterns:

| Handler | Purpose |
|---------|---------|
| `skills.list` | List all loaded skills with metadata and loading errors |
| `skills.get` | Get a specific skill by name, including body content |
| `skills.add` | Add skill from remote source (GitHub, etc.) synchronously |
| `skills.remove` | Remove an installed skill |
| `skills.preview` | Preview skills from a source before installing |
| `skills.install` | Install selected skills from a preview |

The preview/install flow requires state management for temporary directories. A `skillPreviews` Map keyed by `previewId` (UUID) stores preview results between the two calls.

## Architecture

### Type Definitions (`nodeBridge.types.ts`)

```typescript
type SkillSourceType =
  | 'plugin' | 'config' | 'global-claude' 
  | 'global' | 'project-claude' | 'project';

type SkillsListInput = { cwd: string };
type SkillsListOutput = {
  success: boolean;
  data: {
    skills: Array<{ name, description, path, source }>;
    errors: Array<{ path, message }>;
  };
};

type SkillsGetInput = { cwd: string; name: string };
type SkillsGetOutput = {
  success: true;
  data: { skill: { name, description, path, source, body } };
} | { success: false; error: string };

type SkillsAddInput = {
  cwd: string;
  source: string;
  global?: boolean;
  claude?: boolean;
  overwrite?: boolean;
  name?: string;
  targetDir?: string;
};

type SkillsPreviewInput = { cwd: string; source: string };
type SkillsPreviewOutput = {
  success: true;
  data: { previewId: string; skills: Array<...>; errors: Array<...> };
} | { success: false; error: string };

type SkillsInstallInput = {
  cwd: string;
  previewId: string;
  selectedSkills: string[];
  source: string;
  // ...same options as add
};
```

### Handler Implementation (`nodeBridge.ts`)

1. **State Management**: Added `skillPreviews` Map to `NodeHandlerRegistry` class:
   ```typescript
   private skillPreviews = new Map<string, PreviewSkillsResult>();
   ```

2. **Handler Pattern**: Each handler:
   - Gets context via `this.getContext(cwd)`
   - Creates a `SkillManager` instance
   - Calls appropriate SkillManager methods
   - Returns typed response with `success` flag

3. **Preview Lifecycle**:
   - `skills.preview`: Clones repo to temp dir, stores result in Map with UUID key
   - `skills.install`: Retrieves preview from Map, installs selected skills, cleans up temp dir, removes from Map

### Files Modified

1. `src/nodeBridge.types.ts` - Type definitions + HandlerMap entries
2. `src/nodeBridge.ts` - skillPreviews Map + 6 handler implementations
3. `scripts/test-nodebridge.ts` - Added skills handlers to HANDLERS list for discoverability
