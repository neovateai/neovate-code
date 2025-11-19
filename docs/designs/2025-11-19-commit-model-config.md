# Commit Model Configuration

**Date:** 2025-11-19

## Context

The codebase currently uses the global `config.model` setting for all AI operations, including commit message generation and branch name generation. Users may want to use a different (typically smaller/faster) model specifically for commit operations while maintaining a more powerful model for general coding tasks.

The goal is to add an optional `commit.model` configuration that allows users to specify a different model for commit-related operations in `src/commands/commit.ts`.

## Discussion

### Scope Clarification

**Question:** Should `commit.model` override the main model selection for both commit message generation AND branch name generation, or only commit message generation?

**Answer:** Both commit message and branch name generation (Option A).

### Approach Exploration

Two approaches were considered:

**Approach 1: Direct Config Check (Simple)**
- Add `model?: string` to `CommitConfig` type
- Check config directly before each `query()` call
- Temporarily override `context.config.model` if commit model exists
- Trade-offs:
  - ✅ Minimal code changes (~10 lines)
  - ✅ Easy to understand
  - ❌ Requires checking config in multiple places
  - ❌ Mutation-based (temporarily changing context.config)

**Approach 2: Context Override Helper (Clean)**
- Create helper that returns new context with model override
- Use helper before each `query()` call
- Trade-offs:
  - ✅ No mutation, creates new object
  - ✅ Reusable pattern for future commit configs
  - ✅ Cleaner separation of concerns
  - ❌ Slightly more code (~15-20 lines)

**Selected Approach:** Approach 1 (Simple)

However, during implementation discussion, the approach was refined to avoid mutation and use the existing model resolution system properly.

## Approach

The final implementation uses the existing model resolution infrastructure:

1. Add optional `model?: string` field to `CommitConfig` type in `src/config.ts`
2. In both `generateCommitMessage()` and `generateBranchName()`:
   - Check if `context.config.commit?.model` is set
   - If set, resolve it using `resolveModelWithContext(modelConfig, context)`
   - Pass the resolved model to `query()` as the `model` parameter
3. If `commit.model` is not set, `query()` falls back to `context.config.model` (existing behavior)

This approach:
- Uses the proper model resolution system
- Passes model explicitly to `query()`
- Avoids mutation of context
- Leverages existing error handling for invalid models

## Architecture

### Type Definition Changes

**File:** `src/config.ts`

```typescript
export type CommitConfig = {
  language: string;
  systemPrompt?: string;
  model?: string;  // NEW: Override model for commit operations
};
```

The `'commit'` key is already in `OBJECT_CONFIG_KEYS`, so no additional validation changes are needed.

### Implementation Changes

**File:** `src/commands/commit.ts`

**In `generateCommitMessage()`:**

```typescript
async function generateCommitMessage(opts: GenerateCommitMessageOpts) {
  const language = opts.language ?? 'English';
  const systemPrompt = opts.systemPrompt ?? createCommitSystemPrompt(language);
  
  // NEW: Resolve commit-specific model if configured
  let model: ModelInfo | undefined;
  if (opts.context.config.commit?.model) {
    const resolved = await resolveModelWithContext(
      opts.context.config.commit.model,
      opts.context
    );
    model = resolved.model || undefined;
  }
  
  const result = await query({
    userPrompt: opts.prompt,
    systemPrompt,
    context: opts.context,
    model,  // Pass resolved model or undefined
  });
  
  // ... rest remains unchanged
}
```

**In `generateBranchName()`:**

```typescript
async function generateBranchName(opts: GenerateBranchNameOpts) {
  // NEW: Resolve commit-specific model if configured
  let model: ModelInfo | undefined;
  if (opts.context.config.commit?.model) {
    const resolved = await resolveModelWithContext(
      opts.context.config.commit.model,
      opts.context
    );
    model = resolved.model || undefined;
  }
  
  const result = await query({
    userPrompt: opts.commitMessage,
    systemPrompt: createBranchSystemPrompt(),
    context: opts.context,
    model,  // Pass resolved model or undefined
  });
  
  // ... rest remains unchanged
}
```

### Error Handling

Existing error handling in `resolveModelWithContext()` will handle invalid configurations:
- Invalid provider → "Provider X not found, valid providers: ..."
- Invalid model → "Model X not found in provider Y, valid models: ..."

### Fallback Behavior

```typescript
// If commit.model is not set
context.config.commit?.model  // undefined

// query() receives model: undefined
// query() falls back to: context.config.model (existing behavior)
```

### User Configuration

Users can configure the commit model using the existing config commands:

```bash
# Set commit-specific model globally
neo config set commit.model "anthropic/claude-3-5-sonnet-20241022"

# Set commit-specific model for project
neo config set --local commit.model "openai/gpt-4o"

# Check current commit config
neo config get commit.model

# Remove commit model override
neo config remove commit.model
```

### Implementation Size

Estimated ~25-30 lines of new code across two functions.

## Complete Flow

1. User runs `neo commit`
2. System checks `context.config.commit?.model`
3. If set → Resolve model via `resolveModelWithContext()`
4. If not set → Falls back to `context.config.model` in `query()`
5. Model is used for both commit message and branch name generation
