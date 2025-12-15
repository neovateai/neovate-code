# Safe Frontmatter Special Character Handling

**Date:** 2025-12-15

## Context

The `safeFrontMatter` utility fails to parse frontmatter containing special YAML characters in values. For example, command files with `allowed-tools: Read(**), Exec(git log), Write()` throw "Failed to parse frontmatter" errors.

The current fix only handles simple cases where there's a colon in the value, but fails on complex patterns with parentheses, asterisks, brackets, and other special characters.

## Discussion

**Approaches considered:**

1. **Improve the auto-fix regex** - Enhance the current pattern to detect and quote any value containing special YAML characters
2. **Quote all non-simple values** - Automatically quote any value that isn't a simple string/number/boolean (chosen)
3. **Provide better error guidance** - Keep parsing strict but give users clear error messages

**Decision:** Option 2 was chosen for being more robust and catching all edge cases with simpler logic.

**Comment handling:** Comments in frontmatter (lines starting with `#`) should be preserved as-is. Only key-value lines are processed.

## Approach

Use inverse logic: instead of detecting problematic characters, define what a "simple" value looks like and quote everything else.

- Simple values: plain strings matching `/^[a-zA-Z0-9_.\-\s]+$/`, numbers, booleans
- If a value doesn't match the simple pattern and isn't already quoted, wrap it in double quotes

## Architecture

### Regex Pattern

1. **Match key-value lines**: `/^(\s*[a-zA-Z0-9_-]+\s*:\s+)(.+)$/gm`
2. **Simple value pattern**: `/^[a-zA-Z0-9_.\-\s]+$/`
3. **Skip conditions**:
   - Line is a comment (starts with `#`)
   - Value is already quoted (`"..."` or `'...'`)
   - Value matches simple pattern

### Code Flow

```
for each line in frontmatter:
  if line is comment → skip
  if line is key-value:
    if value is already quoted → skip
    if value matches simple pattern → skip
    else → wrap value in quotes, escape internal quotes
```

### Edge Cases

- Multi-line values (lines starting with whitespace) → skip, not key-value
- Empty values (`key:`) → skip, already valid
- Values with internal quotes → escape with `\"`

### Files to Modify

1. `src/utils/safeFrontMatter.ts` - update regex logic
2. `src/utils/safeFrontMatter.test.ts` - add test cases for special chars

Note: `src/outputStyle.ts` requires no changes as it already uses `safeFrontMatter`.

### Test Cases

1. `allowed-tools: Read(**), Exec(git log), Write()` → auto-quoted
2. `argument-hint: [--branch <branch>]` → auto-quoted (brackets)
3. Mixed frontmatter with comments preserved
4. Already quoted values remain unchanged
