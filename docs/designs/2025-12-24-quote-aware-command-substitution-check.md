# Quote-Aware Command Substitution Check

**Date:** 2025-12-24

## Context

The current command substitution detection in `src/tools/bash.ts` uses a simple substring check:

```typescript
if (command.includes('$(') || command.includes('`')) {
  return 'Command substitution is not allowed for security reasons.';
}
```

This blocks legitimate uses where backticks appear as literal string content, such as markdown code fences: `echo "\`\`\`console.log()\`\`\`"`.

## Discussion

### Parsing Sophistication
Three approaches were considered:
1. **Quote-aware parsing** - Only flag when NOT inside single quotes ✓ Selected
2. **Escaped-char aware** - Also allow escaped backticks outside quotes
3. **Full shell parsing** - Use proper shell tokenizer

### Quote Rules
Standard shell semantics chosen:
- Single quotes escape everything (no substitution)
- Double quotes allow substitution unless escaped

### Escaped Backticks
Escaped backticks in double quotes should be allowed: `echo "\`not substitution\`"`

### Implementation Approach
Two approaches considered:
1. **State Machine Parser** - Walk character-by-character, track quote state ✓ Selected
2. **Regex with Negative Lookbehind** - Shorter but harder edge cases

State machine chosen for consistency with existing `splitPipelineSegments()` pattern.

## Approach

Create a new function `hasCommandSubstitution(command: string): boolean` using a state machine parser that respects shell quoting rules.

Replace the simple check in both `validateCommand()` and `isSegmentHighRisk()` with this new function.

## Architecture

### Function Design

```typescript
function hasCommandSubstitution(command: string): boolean
```

**State tracking:**
- `inSingleQuote: boolean`
- `inDoubleQuote: boolean`
- `escaped: boolean`

**Rules:**
1. Inside single quotes → skip all detection (everything literal)
2. Backslash sets `escaped=true` for next char
3. Inside double quotes + escaped → skip (literal backtick)
4. Outside quotes or inside double quotes unescaped → detect `$(` or `` ` ``

### Integration Points

```
validateCommand(command)
    └── hasCommandSubstitution(command) → boolean
    
isSegmentHighRisk(segment)  
    └── hasCommandSubstitution(segment) → boolean
```

### Test Cases

| Input | Expected | Reason |
|-------|----------|--------|
| `echo $(whoami)` | `true` | Unquoted substitution |
| `echo \`whoami\`` | `true` | Unquoted backticks |
| `echo '$(whoami)'` | `false` | Single-quoted literal |
| `echo '\`test\`'` | `false` | Single-quoted backticks |
| `echo "\`test\`"` | `false` | Escaped backticks in double quotes |
| `echo "$(whoami)"` | `true` | Substitution in double quotes |
| `echo "\`\`\`js\`\`\`"` | `false` | Markdown code fence |
| `echo 'foo' $(cmd)` | `true` | Substitution after quoted section |
