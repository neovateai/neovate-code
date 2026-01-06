# Skill Manager Add Skill Method

**Date:** 2025-12-29

## Context

The `SkillManager` in `src/skill.ts` currently only loads skills from predefined directories (global and project). There's a need to add an `addSkill` method that can install skills from GitHub repositories.

Requirements:
- Support `--global`, `--overwrite`, `--name` arguments
- Support installing multiple skills when a repo contains multiple SKILL.md files in subdirs

## Discussion

### URL Format Support
Both short and full URL formats should be supported, including subdirectories:
- `owner/repo` → `github:owner/repo`
- `owner/repo/subdir` → `github:owner/repo/subdir`
- `https://github.com/owner/repo`
- `github:owner/repo#branch` (with branch/tag support)

### Download Mechanism
Use `degit` programmatic API (already installed in project):
```typescript
import degit from 'degit';
const emitter = degit('owner/repo');
await emitter.clone(targetDir);
```

### --name Argument Behavior
When `--name` is provided but the source contains multiple skills, throw an error. The `--name` option only works for single-skill sources.

### API Design Alternatives

**Approach A: Simple Method** - Clean but minimal result handling  
**Approach B: Separate Detect + Install** - More control but two-step process  
**Approach C: Single Method with Comprehensive Result** - Selected approach, one call handles everything with detailed result

## Approach

Use Approach C: A single `addSkill` method that handles the entire flow and returns a comprehensive result object showing installed, skipped, and errored skills.

## Architecture

### New Interfaces

```typescript
export interface AddSkillOptions {
  global?: boolean;      // default: false (project skills dir)
  overwrite?: boolean;   // default: false
  name?: string;         // custom folder name, single skill only
}

export interface AddSkillResult {
  installed: SkillMetadata[];
  skipped: { name: string; reason: string }[];
  errors: SkillError[];
}
```

### New Method

```typescript
async addSkill(source: string, options?: AddSkillOptions): Promise<AddSkillResult>
```

### Implementation Flow

1. **Normalize source** → handle `owner/repo`, `owner/repo/subdir`, full GitHub URLs
2. **Download via degit API** → `degit(source).clone(tempDir)`
3. **Scan for SKILL.md files** → find all in temp dir recursively
4. **Validate**:
   - Error if `--name` provided with multiple skills
   - Parse each SKILL.md using existing `parseSkillFile`
5. **Install each skill**:
   - Target: `global ? globalSkillsDir : projectSkillsDir` + folder name
   - Folder name: `--name` or parent folder of SKILL.md
   - Skip if exists && !overwrite, remove+copy if overwrite
6. **Cleanup temp dir**
7. **Reload skills** via `loadSkills()`
8. **Return result**

### Helper Methods

- `private normalizeSource(source: string): string` - normalize URL formats
- `private async scanForSkills(dir: string): Promise<string[]>` - find all SKILL.md paths recursively
- `private async copySkillFolder(from: string, to: string): Promise<void>` - copy skill directory

### Error Handling

| Scenario | Handling |
|----------|----------|
| degit fails (invalid repo, network error) | Throw error with message from degit |
| No SKILL.md found in downloaded content | Return `{ installed: [], skipped: [], errors: [{ path: source, message: 'No skills found' }] }` |
| --name with multiple skills | Throw error: "Cannot use --name when source contains multiple skills" |
| SKILL.md parsing fails (invalid frontmatter) | Add to errors array, continue with other skills |
| Skill already exists (no --overwrite) | Add to skipped array with reason "already exists" |
| Target directory not writable | Throw error |
