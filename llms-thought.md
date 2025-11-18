# Extended Thinking Support Design Document

## Goal

Enable extended thinking for LLMs that support it (e.g., claude-sonnet-4.5) by default, using the existing `reasoning: true` metadata flag in model definitions.

## Context

The codebase already has:
- A `reasoning` boolean field in model metadata (`src/model.ts:39`)
- Support for handling `reasoning-delta` chunks in the loop (`src/loop.ts:258-259`)
- A `claude-3-7-sonnet-20250219-thinking` model variant already configured
- UI components to display reasoning/thinking output

## Decision: Approach 1 - Provider-specific Configuration Injection

**Core idea:** Detect the model's `reasoning` flag and inject provider-specific thinking configuration when calling `doStream`.

### Why This Approach?

**Pros:**
- Clean separation - each provider's thinking config stays isolated
- Easy to extend for other providers (OpenAI, etc.)
- Uses existing `reasoning: true` metadata as requested
- No duplicate model definitions needed

**Cons:**
- Requires understanding provider-specific parameters
- Need to handle different thinking configurations per provider

**Complexity:** Medium - requires provider detection and config mapping

### Rejected Alternatives

#### Approach 2: Model ID Suffix Pattern Matching
- Keep the existing `-thinking` suffix pattern
- Requires duplicate model definitions
- Doesn't leverage existing `reasoning` metadata
- **Rejected:** Doesn't meet goal of using `reasoning: true`

#### Approach 3: Combined Metadata + Configuration Layer
- Use `reasoning: true` + additional `thinkingConfig` field
- More flexible but adds complexity
- Additional configuration layer needed
- **Rejected:** Over-engineered for current needs

## Detailed Design

### Architecture Overview

**High-level flow:**

```
loop.ts (runLoop) → Check model.reasoning flag
                  ↓
            Provider Detection
                  ↓
        Thinking Config Mapper → Provider-specific config
                  ↓
         Inject into doStream call
```

**Key components:**

1. **Thinking Config Mapper** (`src/thinking-config.ts`)
   - Maps provider ID to thinking configuration
   - Returns appropriate config object for each provider
   - Returns `undefined` if provider doesn't support thinking or reasoning is disabled

2. **Integration in loop.ts**
   - Before calling `m.doStream()` at line 231
   - Check if `opts.model.model.reasoning === true`
   - Get thinking config based on provider
   - Merge config into doStream parameters

3. **Provider-specific configurations:**
   - **Anthropic**: `{ thinking: { type: 'enabled', budget_tokens: 10000 } }`
   - **Future providers**: Easy to extend with new mappings

### Component 1: Thinking Config Mapper

**File: `src/thinking-config.ts`**

**Core function signature:**
```typescript
function getThinkingConfig(
  providerId: string,
  reasoning: boolean
): Record<string, any> | undefined
```

**Logic:**
1. If `reasoning === false`, return `undefined` (no thinking config)
2. Switch on `providerId`:
   - `'anthropic'`: Return `{ thinking: { type: 'enabled', budget_tokens: 10000 } }`
   - `'github-copilot'`: Check if model is Anthropic-backed, return same config
   - Other providers: Return `undefined` (not yet supported)

**Provider mapping:**
```typescript
const ANTHROPIC_THINKING_CONFIG = {
  thinking: {
    type: 'enabled' as const,
    budget_tokens: 10000,
  }
};
```

**GitHub Copilot handling:**
- GitHub Copilot proxies multiple providers (Claude, GPT, etc.)
- Only apply thinking config for Claude models via Copilot
- Check model ID for `claude` prefix to determine this

**Configuration values:**
- `budget_tokens: 10000` - reasonable default for extended thinking
- `type: 'enabled'` - always enable when reasoning is supported
- These could be made configurable later, but start with sensible defaults

### Component 2: Integration into loop.ts

**Modification point:** Around line 231 where `m.doStream()` is called

**Current code:**
```typescript
const result = await m.doStream({
  prompt: prompt,
  tools,
  toolChoice: { type: 'auto' },
  abortSignal: abortController.signal,
});
```

**Modified code:**
```typescript
// Import at top
import { getThinkingConfig } from './thinking-config';

// Before doStream call (around line 220-230)
const thinkingConfig = getThinkingConfig(
  opts.model.provider.id,
  opts.model.model.reasoning
);

const result = await m.doStream({
  prompt: prompt,
  tools,
  toolChoice: { type: 'auto' },
  abortSignal: abortController.signal,
  ...thinkingConfig,  // Spread the thinking config if it exists
});
```

**Key points:**
- Use spread operator `...thinkingConfig` to merge config
- If `thinkingConfig` is `undefined`, spreading it has no effect (clean)
- No conditional logic needed - the spread handles it elegantly
- Thinking config is determined once per turn, not per retry

**Error handling:**
- No special error handling needed
- If provider doesn't support thinking config, it will ignore unknown parameters
- The `reasoning-delta` chunks are already handled in the existing chunk processing loop (lines 258-260)

## Edge Cases & Considerations

### 1. Handling existing `-thinking` suffix models

The codebase already has `claude-3-7-sonnet-20250219-thinking` defined. With this new approach:
- That model variant still works (it has `reasoning: true`)
- No need for separate `-thinking` variants going forward
- Future: Could deprecate `-thinking` suffixes since all reasoning models auto-enable

### 2. Configuration override capability (Future Work)

Add optional override in model-specific config or global config:
```typescript
// In thinking-config.ts
export interface ThinkingConfigOptions {
  enabled?: boolean;  // User can disable even if reasoning: true
  budget_tokens?: number;  // User can customize budget
}
```

This would be future work - start simple with hardcoded defaults.

### 3. Stagewise plugin `isReasoningModel` import

The `stagewise.ts` plugin imports `isReasoningModel` from `../provider` (line 172), but this doesn't exist.
- **Decision:** Ignore for now - might be dead code or planned feature
- Can be addressed separately if needed

### 4. Testing

- Manual testing with `claude-sonnet-4-5-20250929` model
- Verify `reasoning-delta` chunks are received and displayed
- Test with non-reasoning models to ensure no config is injected
- No automated tests required for initial implementation

## Implementation Summary

**Files to create/modify:**
1. **NEW**: `src/thinking-config.ts` - Provider-specific thinking configuration mapper
2. **MODIFY**: `src/loop.ts` - Integrate thinking config into doStream call

**Expected behavior:**
- Models with `reasoning: true` (like claude-sonnet-4.5) will automatically use extended thinking
- Extended thinking output appears via existing `reasoning-delta` chunk handling
- Models without reasoning support are unaffected

**Future enhancements:**
- User-configurable thinking budgets
- Support for additional providers (OpenAI, etc.)
- Deprecation of `-thinking` model suffix pattern
