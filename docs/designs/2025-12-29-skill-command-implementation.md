# Skill Command Implementation

## Summary

Add `neovate skill` CLI command with three subcommands: `add`, `list`, and `remove`. Uses Ink/React UI for rich visual feedback with spinners and formatted tables.

## Background

The skill system allows users to install reusable agent capabilities. `SkillManager` in `src/skill.ts` already handles loading and adding skills. This design adds a CLI interface and completes the remove functionality.

## Design

### File Structure

**New file:** `src/commands/skill.tsx`

```
skill.tsx
├── Types (SkillCommandState, SkillOptions)
├── Components
│   ├── SkillListTable - table display for list command
│   ├── AddSkillUI - progress/result UI for add command
│   └── RemoveSkillUI - confirmation/result UI for remove
├── printHelp() - help text
├── resolveTargetDir() - resolve --target/--global to path
└── runSkill(context) - entry point
```

### CLI Interface

```
Usage: neovate skill <command> [options]

Commands:
  add <source>     Install skills from a source
  list             List all available skills
  remove <name>    Remove an installed skill

Global Options:
  -h, --help       Show help
  --target <dir>   Target directory for skills
```

#### `add` Command

```
neovate skill add [options] <source>

Options:
  --target <dir>   Target directory for skills
  --global, -g     Install to global skills directory (~/.neovate/skills/)
  --overwrite      Overwrite existing skill with the same name
  --name <name>    Install with a custom local name
```

**Behavior:**
- Default target: project skills dir (`.neovate/skills/`)
- `--global` overrides to `~/.neovate/skills/`
- `--target` overrides both
- Uses existing `SkillManager.addSkill()` method
- Shows spinner during clone, then results (installed/skipped/errors)

#### `list` Command

```
neovate skill list [options]

Options:
  --target <dir>   Target directory for skills
  --json           Output as JSON
```

**Behavior:**
- Lists skills from ALL 4 sources by default (global-claude, global, project-claude, project)
- `--json` outputs raw JSON array, bypasses Ink
- Table columns: Name | Source | Description

#### `remove` Command

```
neovate skill remove [options] <name>

Options:
  --target <dir>   Target directory for skills
```

**Behavior:**
- Requires `--target` or defaults to project skills dir
- User must specify location (no auto-search across sources)
- Deletes the skill folder entirely

### Required Changes to `src/skill.ts`

Add `removeSkill()` method to `SkillManager`:

```typescript
async removeSkill(
  name: string,
  targetDir?: string
): Promise<{ success: boolean; error?: string }> {
  const skillsDir = targetDir || path.join(this.paths.projectConfigDir, 'skills');
  const skillDir = path.join(skillsDir, name);
  
  if (!fs.existsSync(skillDir)) {
    return { success: false, error: 'Skill not found' };
  }
  
  const skillPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    return { success: false, error: 'Invalid skill directory (no SKILL.md)' };
  }
  
  fs.rmSync(skillDir, { recursive: true });
  await this.loadSkills();
  return { success: true };
}
```

### Component Design

#### AddSkillUI

```tsx
type AddState = 
  | { phase: 'cloning' }
  | { phase: 'done'; result: AddSkillResult }
  | { phase: 'error'; error: string };

const AddSkillUI: React.FC<{
  source: string;
  options: AddSkillOptions;
  skillManager: SkillManager;
  onExit: () => void;
}>;
```

- Shows `<Spinner>` during clone
- On completion, displays:
  - Installed skills (green)
  - Skipped skills (yellow, with reason)
  - Errors (red)
- Auto-exits after 1.5s

#### SkillListTable

```tsx
const SkillListTable: React.FC<{
  skills: SkillMetadata[];
  onExit: () => void;
}>;
```

- Renders table with columns: Name | Source | Description
- Uses Ink's `<Box>` for layout
- Source shown as badges: `[global]`, `[project]`, etc.

#### RemoveSkillUI

```tsx
type RemoveState =
  | { phase: 'removing' }
  | { phase: 'done' }
  | { phase: 'error'; error: string };

const RemoveSkillUI: React.FC<{
  name: string;
  targetDir: string;
  skillManager: SkillManager;
  onExit: () => void;
}>;
```

- Shows spinner during removal
- Confirms success or displays error

### Entry Point Integration

Update `src/cli.ts` to route `skill` command:

```typescript
case 'skill':
  const { runSkill } = await import('./commands/skill');
  await runSkill(context);
  break;
```

### Target Directory Resolution

```typescript
function resolveTargetDir(
  argv: { target?: string; global?: boolean },
  paths: Paths
): string {
  if (argv.target) return path.resolve(argv.target);
  if (argv.global) return path.join(paths.globalConfigDir, 'skills');
  return path.join(paths.projectConfigDir, 'skills');
}
```

## Alternatives Considered

1. **Pure CLI (like mcp.ts)**: Simpler but lacks visual feedback during long operations like cloning
2. **CLI + chalk**: Middle ground but no interactivity

Chose Ink/React for consistency with `run.tsx` and better UX during async operations.

## Testing

- Unit test `removeSkill()` method in skill.ts
- E2E test for add/list/remove flow

## Implementation Plan

1. Add `removeSkill()` method to `SkillManager`
2. Create `src/commands/skill.tsx` with components
3. Wire up in `src/cli.ts`
4. Add tests
