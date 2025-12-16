# Claude Commands Directory Support

**Date:** 2025-12-12

## Context

The slash command system currently loads custom commands from:
- `~/.{productName}/commands/` (global user commands)
- `./{cwd}/.{productName}/commands/` (project-level commands)

To improve compatibility with the Claude ecosystem, we want to also support loading commands from `.claude/commands` and `~/.claude/commands` directories. This allows users to share command files between different Claude-compatible tools.

## Discussion

### Key Questions Explored

**Q: How should `.claude/commands` relate to existing command sources?**

Three options were considered:
- **A) Replace** — Only use `.claude/commands`, removing product-specific paths
- **B) Add** — Include both `.claude/commands` AND `.{productName}/commands` as sources ✅ **Chosen**
- **C) Configurable** — Let users choose which paths to use via config

Option B was selected to maintain backward compatibility while adding Claude ecosystem support.

**Q: What priority order when same command exists in multiple locations?**

Agreed priority (later sources override earlier):
1. Builtin commands
2. Plugin commands
3. `~/.claude/commands/` (global claude)
4. `~/.{productName}/commands/` (global product)
5. `.claude/commands/` (project claude)
6. `.{productName}/commands/` (project product)

Rationale: Project-level overrides global, and product-specific overrides generic.

### Approaches Considered

| Approach | Description | Complexity | Pros | Cons |
|----------|-------------|------------|------|------|
| **A: Minimal Inline** ✅ | Add paths directly in constructor | Low | ~15-20 lines, easy to understand | Hardcoded `.claude` string |
| **B: Configurable Paths** | Add `getCommandPaths()` to Paths class | Medium | Cleaner separation, extensible | More refactoring |
| **C: Command Loader Abstraction** | Create CommandLoader interface | High | Most extensible | Over-engineered (YAGNI) |

Approach A was selected for simplicity.

## Approach

Modify `SlashCommandManager` to load commands from 6 sources instead of 4, by adding the Claude-specific paths inline in the constructor. The existing `#loadGlobal()` and `#loadProject()` methods are reused without modification.

## Architecture

### Files Changed

- `src/slashCommand.ts` — Main implementation changes

### Code Changes

**1. Modify constructor to load 6 sources:**
```typescript
// 3. global (.claude)
const globalClaude = this.#loadGlobal(
  path.join(path.dirname(opts.paths.globalConfigDir), '.claude', 'commands'),
);
globalClaude.forEach((command) => {
  commands.set(command.command.name, command);
});

// 4. global (.{productName})
const global = this.#loadGlobal(path.join(opts.paths.globalConfigDir, 'commands'));
global.forEach((command) => {
  commands.set(command.command.name, command);
});

// 5. project (.claude)
const projectClaude = this.#loadProject(
  path.join(path.dirname(opts.paths.projectConfigDir), '.claude', 'commands'),
);
projectClaude.forEach((command) => {
  commands.set(command.command.name, command);
});

// 6. project (.{productName})
const project = this.#loadProject(path.join(opts.paths.projectConfigDir, 'commands'));
project.forEach((command) => {
  commands.set(command.command.name, command);
});
```

The `.claude` paths are derived from existing `globalConfigDir` and `projectConfigDir` using `path.dirname()` to go up one directory level, then joining with `.claude/commands`. This avoids adding new parameters or imports.

### Error Handling

- `loadPolishedMarkdownFiles()` already handles missing directories gracefully (returns empty array)
- No additional error handling needed

### Edge Cases

| Case | Behavior |
|------|----------|
| `.claude/commands` doesn't exist | Ignored silently |
| Same command in multiple locations | Later source wins (correct priority) |
| Empty directories | No commands loaded from that source |

### Description Display

- Commands from `~/.claude/commands/` display as `(global)`
- Commands from `.claude/commands/` display as `(project)`
- Handled by existing `#loadGlobal` and `#loadProject` methods
