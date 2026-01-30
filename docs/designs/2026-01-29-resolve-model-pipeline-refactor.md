# Refactor resolveModelWithContext Pipeline

**Date:** 2026-01-29

## Context

The `resolveModelWithContext` function in `src/model.ts` had a bug where providers with `apiFormat` but no `createModel` function (like `moonshotai-cn`) would fail at runtime with:

```
error: provider.createModel is not a function
```

The root cause was that normalization logic (adding `createModel` based on `apiFormat`) was only applied to config providers during the merge step, not to built-in providers.

The goal was to refactor `resolveModelWithContext` into a clear pipeline:
1. Get hooked providers
2. Get config providers
3. Merge (config wins on overlap)
4. Normalize ALL providers
5. Apply global proxy
6. Resolve model

## Discussion

### Key Questions & Decisions

1. **Should normalization be a separate step or stay inside merge?**
   - Decision: Separate step after merge, applied to ALL providers (both built-in and config)

2. **When merging hooked and config providers, which takes precedence?**
   - Decision: Config wins (using `defu` for deep merge)

3. **Should the refactoring scope include `resolveModel`?**
   - Decision: Yes, include `resolveModel` to remove the unsafe `!` assertion

### Approaches Explored

| Approach | Description | Trade-offs |
|----------|-------------|------------|
| A: Pipeline (Chosen) | Sequential pure functions for each step | Clear separation, easy to test, multiple iterations |
| B: Single-Pass | Combine merge + normalize in one pass | Efficient but mixes concerns |
| C: Provider Class | Lazy normalization via wrapper class | Complex, YAGNI |

## Approach

Transform provider processing into a clear sequential pipeline where each step is a pure function:

```
hookedProviders → merge(configProviders) → normalize → applyGlobalProxy → finalProviders
```

After normalization, all providers are guaranteed to have:
- `id: string`
- `name: string`
- `createModel: ModelCreator` (never undefined)
- `models: Record<string, Model>` (all string refs resolved)

This means `resolveModel` can safely call `provider.createModel()` with an assertion guard instead of the unsafe `!` operator.

## Architecture

### New Functions

```typescript
// Step 1: Get providers from plugin hooks
async function getHookedProviders(context: Context): Promise<ProvidersMap>

// Step 2: Merge two provider maps (config wins)
function mergeProviders(
  base: ProvidersMap,
  override: Record<string, ProviderConfig>,
): ProvidersMap

// Step 3: Normalize all providers
function normalizeProviders(providers: ProvidersMap): ProvidersMap
```

### normalizeProviders Implementation

```typescript
function normalizeProviders(providers: ProvidersMap): ProvidersMap {
  const result: ProvidersMap = {};

  for (const [providerId, provider] of Object.entries(providers)) {
    const normalized = { ...provider } as Provider;

    // Ensure id
    if (!normalized.id) {
      normalized.id = providerId;
    }

    // Ensure name
    if (!normalized.name) {
      normalized.name = providerId;
    }

    // Ensure createModel based on apiFormat
    if (!normalized.createModel) {
      const creatorMap = {
        anthropic: defaultAnthropicModelCreator,
        openai: defaultModelCreator,
        responses: openaiModelResponseCreator,
      };
      const apiFormat = normalized.apiFormat || 'openai';
      normalized.createModel = creatorMap[apiFormat];
    }

    // Resolve model string references
    if (normalized.models) {
      for (const modelId in normalized.models) {
        const model = normalized.models[modelId];
        if (typeof model === 'string') {
          const actualModel = models[model];
          assert(actualModel, `Model ${model} not exists.`);
          normalized.models[modelId] = actualModel;
        }
      }
    }

    result[providerId] = normalized;
  }

  return result;
}
```

### Refactored resolveModelWithContext

```typescript
export async function resolveModelWithContext(
  name: string | null,
  context: Context,
) {
  // Step 1: Get hooked providers
  const hookedProviders = await getHookedProviders(context);

  // Step 2: Merge with config providers (config wins)
  const mergedProviders = context.config.provider
    ? mergeProviders(hookedProviders, context.config.provider)
    : hookedProviders;

  // Step 3: Normalize ALL providers
  let finalProviders = normalizeProviders(mergedProviders);

  // Step 4: Apply global proxy
  if (context.config.httpProxy) {
    finalProviders = applyGlobalProxyToProviders(
      finalProviders,
      context.config.httpProxy,
    );
  }

  // ... rest unchanged
}
```

### resolveModel Change

Added assertion guard before calling `createModel`:

```typescript
assert(
  provider.createModel,
  `Provider ${providerStr} has no createModel function`,
);
```

This provides a clear error message if normalization somehow fails, instead of a cryptic "undefined is not a function" error.

### Bug Fix

The `moonshotai-cn` provider (and any similar providers with only `apiFormat: 'openai'`) now works correctly because `normalizeProviders` adds the appropriate `createModel` function based on `apiFormat`.
