# Consolidate AI Response Sanitization

**Date:** 2026-01-04

## Context

The codebase has inconsistent handling of AI text responses across different commands:

- **`run.tsx`**: Has robust `sanitizeCommand` function that handles think tags, code blocks (```), and inline code (`)
- **`commit.tsx`** (via `nodeBridge.ts`): Only uses `stripThinkTags` from `safeParseJson.ts`

This leads to potential issues where commit message generation could fail to parse AI responses that include Markdown formatting, while run command handles them correctly.

Goals:
1. Consolidate sanitization approaches into a shared utility
2. Add Markdown/code block stripping to the commit flow

## Discussion

### Approaches Explored

**Approach A: Extend Existing `safeParseJson.ts`**
- Add full sanitization logic to existing file
- ✅ Minimal file changes
- ❌ File name becomes misleading (not just JSON-related)

**Approach B: New Dedicated Utility File** (Selected)
- Create `src/utils/sanitizeAIResponse.ts` with consolidated logic
- Export both full sanitizer and individual helpers
- ✅ Clear separation of concerns
- ✅ Composable - callers can pick what they need

**Approach C: Pipeline/Chain Pattern**
- Configurable sanitizer with options object
- ❌ Over-engineered for current needs (YAGNI violation)

### Decision

**Approach B** was selected for clean separation and composability.

## Approach

Create a new dedicated utility file that:
1. Provides composable individual functions for each sanitization step
2. Exports a main `sanitizeAIResponse` function that composes all steps
3. Allows callers to use full sanitization or individual helpers as needed

## Architecture

### New File: `src/utils/sanitizeAIResponse.ts`

**Exports:**

| Function | Purpose |
|----------|---------|
| `stripThinkTags(text)` | Removes `<think>...</think>` tags |
| `stripCodeBlocks(text)` | Removes ``` wrappers, extracts content |
| `stripInlineCode(text)` | Removes wrapping backticks (preserves shell backticks) |
| `sanitizeAIResponse(text)` | Composes all three + trim (main entry point) |

**Composition order in `sanitizeAIResponse`:**
1. `stripThinkTags` - removes reasoning before any text parsing
2. `stripCodeBlocks` - extracts content from markdown blocks
3. `stripInlineCode` - handles single backtick wrapping edge case
4. Final `.trim()`

### Migration Plan

| File | Change |
|------|--------|
| `src/utils/sanitizeAIResponse.ts` | New file with all exports |
| `src/utils/safeParseJson.ts` | Remove `stripThinkTags`, keep only `safeParseJson` |
| `src/nodeBridge.ts` | Update import to use `sanitizeAIResponse` |
| `src/commands/run.tsx` | Delete local `sanitizeCommand`, import `sanitizeAIResponse` |

No re-export for backward compatibility - clean break with only 2 files to update.

### Edge Cases

1. **Nested think tags** - Handled by non-greedy regex `*?`
2. **Multiple code blocks** - Only strip if entire response is one code block
3. **Shell backticks** - `stripInlineCode` only removes when exactly 2 backticks wrap entire string
4. **Empty result** - Return empty string after stripping
5. **Mixed content** - `<think>...</think>\n```bash\nls\n```\n` → `ls`

### Test Cases (`sanitizeAIResponse.test.ts`)

```
- "hello" → "hello" (no-op)
- "<think>reasoning</think>result" → "result"
- "```bash\nls -la\n```" → "ls -la"
- "`pwd`" → "pwd"
- "<think>hmm</think>\n```sh\necho `date`\n```" → "echo `date`"
- "  spaced  " → "spaced" (trim)
- "" → ""
```
