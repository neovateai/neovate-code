# SDK Skills Option

**Date:** 2026-01-20

## Context

The SDK (`src/sdk.ts`) provides a programmatic API for creating sessions and interacting with the Neovate Code agent. While the system already supports skills through multiple channels (file system locations, plugins, and `config.skills`), there was no direct way to programmatically register skills when using the SDK.

Users needed a simple, direct option in `SDKSessionOptions` to pass skill paths without having to use the plugin system or rely on file system conventions.

## Discussion

### Analysis of Existing Architecture

The investigation revealed the following data flow:

1. `sdk.ts` creates a `NodeBridge` with `contextCreateOpts`
2. `NodeBridge` creates a `Context` via `Context.create()`
3. `Context.create()` automatically creates and loads the `SkillManager`
4. When tools are resolved, if skills exist, the `skill` tool is added

### Key Finding

The `config.skills` property was already supported and handled in `SkillManager.loadSkills()`. The `argvConfig` is merged into the final config via `defu` in `ConfigManager`. This meant the cleanest approach was to pass skills through `argvConfig`, following the same pattern used for `providers`.

### Format Decision

The user confirmed the `skills` option should accept **both file paths and directory paths** (auto-detect), consistent with how `config.skills` already works. The `SkillManager.loadSkillPath()` method handles both:
- Direct paths to `SKILL.md` files
- Directories containing `SKILL.md`

## Approach

Add a `skills` option to `SDKSessionOptions` and pass it through `argvConfig` to leverage the existing infrastructure. This is a minimal, non-invasive change that reuses all existing skill loading logic.

## Architecture

### Changes Made

**1. Type Definition (`SDKSessionOptions`)**

```typescript
export type SDKSessionOptions = {
  model: string;
  cwd?: string;
  productName?: string;
  plugins?: Plugin[];
  providers?: Record<string, ProviderConfig>;
  /**
   * Extra SKILL.md file paths for user-defined skills.
   * Accepts absolute paths to SKILL.md files or directories containing SKILL.md.
   */
  skills?: string[];
};
```

**2. Pass Through `argvConfig`**

In `createBridgePair()`:

```typescript
argvConfig: {
  model: options.model,
  provider: options.providers,
  skills: options.skills,  // Added
},
```

### Data Flow

```
SDKSessionOptions.skills
    ↓
argvConfig.skills
    ↓
ConfigManager.config.skills (merged via defu)
    ↓
SkillManager.loadSkills() reads from context.config.skills
    ↓
Skills available via skill tool
```

### Usage Example

```typescript
import { createSession } from '@neovate/code';

const session = await createSession({
  model: 'openai/gpt-4',
  skills: [
    '/path/to/my-skill/SKILL.md',
    '/path/to/skill-directory',
  ],
});
```

### Files Modified

- `src/sdk.ts`: Added `skills` property to `SDKSessionOptions` type and passed it to `argvConfig`
