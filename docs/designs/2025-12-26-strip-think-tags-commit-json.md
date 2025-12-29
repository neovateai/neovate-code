# Strip Think Tags from Commit Message JSON

**Date:** 2025-12-26

## Context

When generating commit messages via AI, some models return responses wrapped in `<think>` tags before the actual JSON content:

```
<think></think>
{
  "commitMessage": "feat: add b.js file",
  "branchName": "feat/add-bjs-file",
  "isBreakingChange": false,
  "summary": "Added new empty b.js file to the repository."
}
```

This causes `JSON.parse()` to fail in the `project.generateCommit` handler in `nodeBridge.ts`, breaking the commit command functionality.

## Discussion

### Key Questions Explored

1. **Where to implement the stripping logic?**
   - Option A: Directly in `nodeBridge.ts` only
   - Option B: Create a reusable utility function
   - **Decision:** Create a utility function for reusability

2. **Where to place the utility function?**
   - Option A: Add to existing `utils/safeParseJson.ts`
   - Option B: Add to `utils/string.ts`
   - Option C: Create new dedicated file
   - **Decision:** Add to `safeParseJson.ts` as it's related to JSON parsing utilities

3. **Which regex pattern to use?**
   - Option A: `/<think>[\s\S]*?<\/think>/g` - handles multi-line content
   - Option B: `/<think>(?:.|\n)*?<\/think>/g` - alternative pattern
   - **Decision:** Standard regex with `[\s\S]*?` for clarity and reliability

## Approach

Add a `stripThinkTags()` utility function that removes all `<think>...</think>` blocks from text before JSON parsing. This provides a centralized, reusable solution that can be applied wherever AI responses may contain think tags.

## Architecture

### Data Flow

```
AI Response: "<think>...</think>\n{...json...}"
    ↓ stripThinkTags()
Clean JSON: "{...json...}"
    ↓ JSON.parse()
Parsed Object
```

### Implementation

1. **`src/utils/safeParseJson.ts`** - New function:
   ```typescript
   export function stripThinkTags(text: string): string {
     return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
   }
   ```

2. **`src/nodeBridge.ts`** - Usage in `project.generateCommit` handler:
   - Import `stripThinkTags` from utils
   - Call before `JSON.parse()`: `const cleanedText = stripThinkTags(result.data.text)`

### Error Handling

Existing error handling remains intact - if JSON parsing still fails after stripping, the error message displays the raw response for debugging.
