# Anthropic Prompt Caching

**Date:** 2025-11-12

## Overview

Add prompt caching support for Anthropic models (Sonnet and Opus) to optimize API costs and latency by caching repeated prompt content.

## Requirements

- Create `promptCache.ts` module to add caching properties to prompts
- Apply cache control to all messages when model name includes "sonnet" or "opus"
- Add `providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } }` to each message
- Integrate into `src/loop.ts` after prompt construction

## Architecture

### Module Structure

**File: `src/promptCache.ts`**

Single exported function:
```typescript
export function addPromptCache(
  prompt: LanguageModelV2Prompt,
  model: ModelInfo
): LanguageModelV2Prompt
```

**Core Logic Flow:**
1. Check if model name includes "sonnet" or "opus" (case-insensitive)
2. If no match, return original prompt unchanged
3. If match, map over each message and add Anthropic-specific cache control
4. Return new prompt array with enhanced messages

**Type Safety:**
- Import types from `@ai-sdk/provider`
- Import `ModelInfo` from `./model`
- Preserve all existing message properties

### Integration Point

In `loop.ts` after line 213 (after `prompt` is created and optionally normalized):
```typescript
prompt = addPromptCache(prompt, opts.model);
```

This happens after `At.normalizeLanguageV2Prompt()` so cache control is applied to the final prompt structure.

## Implementation

### Model Detection

```typescript
const modelId = model.model.id.toLowerCase();
const shouldCache = modelId.includes('sonnet') || modelId.includes('opus');
```

Checks the `model.model.id` property (e.g., "claude-3-5-sonnet-20241022") for substring match.

### Message Transformation

```typescript
return prompt.map(message => ({
  ...message,
  providerOptions: {
    anthropic: {
      cacheControl: { type: "ephemeral" }
    }
  }
}));
```

Uses spread operator to preserve all existing message properties, adds nested `providerOptions` structure.

### Edge Cases

- If message already has `providerOptions`, it will be overwritten (by design)
- Empty prompt array returns empty array
- Non-matching models return original prompt reference (no allocation)

## Complete Code

**File: `src/promptCache.ts`**
```typescript
import type { LanguageModelV2Prompt } from '@ai-sdk/provider';
import type { ModelInfo } from './model';

export function addPromptCache(
  prompt: LanguageModelV2Prompt,
  model: ModelInfo,
): LanguageModelV2Prompt {
  const modelId = model.model.id.toLowerCase();
  const shouldCache = modelId.includes('sonnet') || modelId.includes('opus');

  if (!shouldCache) {
    return prompt;
  }

  return prompt.map((message) => ({
    ...message,
    providerOptions: {
      anthropic: {
        cacheControl: { type: 'ephemeral' },
      },
    },
  }));
}
```

**Changes to `src/loop.ts`:**
1. Add import: `import { addPromptCache } from './promptCache';`
2. After line 213, add: `prompt = addPromptCache(prompt, opts.model);`

## Testing Strategy

**Manual Testing:**
1. Run with sonnet/opus model - verify cache control in debug logs
2. Run with non-Anthropic model - verify no cache control added
3. Test with empty conversation and multi-turn conversation

**Unit Test Considerations:**
- Test sonnet detection
- Test opus detection
- Test case-insensitivity
- Test non-matching models return original
- Test message structure preservation

## Benefits

- Reduced API costs for repeated prompts with Anthropic models
- Lower latency for cached content
- Zero impact on non-Anthropic models
- Simple, maintainable implementation
