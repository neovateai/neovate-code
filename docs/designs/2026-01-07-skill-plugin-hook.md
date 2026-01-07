# Skill Plugin Hook Support

## Context
Currently, skills are loaded only from the filesystem (`.neovate/skills` and `.claude/skills`). To support distributing skills via plugins (e.g., npm packages), we need to add a hook mechanism similar to `slashCommand`.

## Goals
- Allow plugins to provide skills.
- Maintain priority order: `Builtin/Plugin < Global < Project`.
- Consistent API with `slashCommand` hooks.

## Design

### 1. Plugin Interface Update
Add a `skill` hook to the `Plugin` interface in `src/plugin.ts`.

```typescript
// src/plugin.ts
export type Plugin = {
  // ... existing hooks
  
  /**
   * Register new skills.
   * Returns a list of absolute paths to SKILL.md files.
   */
  skill?: (
    this: PluginContext,
  ) => Promise<string[]> | string[];
};
```

This hook uses `PluginHookType.SeriesMerge` to aggregate skill paths from all plugins.

### 2. Skill Source Update
Add `Plugin` to the `SkillSource` enum in `src/skill.ts` to track origin.

```typescript
// src/skill.ts
export enum SkillSource {
  // ... existing sources
  Plugin = 'plugin',
}
```

### 3. SkillManager Integration
Update `SkillManager` to be aware of the `Context` (to access plugins) and load skills from the `skill` hook.

- Add `setContext(context: Context)` method.
- Update `loadSkills()` to:
  1. If context is available, call `context.apply({ hook: 'skill', ... })`.
  2. Parse returned paths and register them with `SkillSource.Plugin`.
  3. Load filesystem skills (Global, Project) which will override plugins if names match.

```typescript
// src/skill.ts
export class SkillManager {
  private context?: Context;

  setContext(context: Context) {
    this.context = context;
  }

  async loadSkills() {
    this.skillsMap.clear();
    
    // 1. Load Plugin Skills
    if (this.context) {
      const pluginSkillPaths = await this.context.apply({
        hook: 'skill',
        args: [],
        type: PluginHookType.SeriesMerge,
      });
      // Process paths...
    }

    // 2. Load Global/Project Skills (existing logic)
    // ...
  }
}
```

### 4. Context Initialization Lifecycle
In `src/context.ts`, defer `skillManager.loadSkills()` until after the `Context` is created, so that plugins have access to the full context during initialization.

```typescript
// src/context.ts - Context.create()
const skillManager = new SkillManager({ paths });
// Removed: await skillManager.loadSkills();

const context = new Context({
  // ...
  skillManager,
  // ...
});

skillManager.setContext(context);
await skillManager.loadSkills();

// ... continue with agentManager
```

## Implementation Plan

1.  **Modify `src/plugin.ts`**: Add `skill` hook definition.
2.  **Modify `src/skill.ts`**: Update `SkillSource`, add `setContext`, implementation `loadSkills` plugin logic.
3.  **Modify `src/context.ts`**: Update initialization order.
4.  **Tests**: Add e2e test ensuring plugin skills are loaded and overridable.
