# API Key Round-Robin Rotation

**Date:** 2025-11-12

## Context

The `getProviderApiKey` function in `src/model.ts` has a TODO comment indicating a need to handle API keys that contain multiple comma-separated values. The requirement is to implement round-robin rotation: when an API key contains multiple keys separated by commas (e.g., "key1,key2,key3"), the system should rotate through them sequentially with each request (key1 → key2 → key3 → key1...).

This functionality should be extracted to a utility file under `src/utils` with temporary state stored in memory within the utility module.

## Discussion

**Rotation Strategy Options Explored:**
- Round-robin per request (selected)
- Sticky until failure
- Random selection
- Load balancing

**Implementation Approach Options:**

1. **Simple Module-Level Counter** (selected)
   - Single utility function with module-level state
   - Global counter shared across all providers
   - Simple implementation with minimal code
   - Counter resets on process restart
   - Counter never explicitly resets but bounded by modulo operation

2. **Provider-Keyed Rotation Map**
   - Map with provider ID as key for isolated rotation per provider
   - More accurate round-robin per provider
   - Requires passing provider ID as parameter

3. **Stateful Class Instance**
   - Class-based approach with instance per provider
   - Most encapsulated and testable
   - Overkill for simple round-robin requirements

## Approach

Implement a simple module-level counter approach with a new utility file `src/utils/apiKeyRotation.ts`. The utility will export a single pure function that:
- Accepts an API key string
- Detects comma-separated keys
- Rotates through them using a module-level counter
- Returns a single key for the current request

The `getProviderApiKey()` function in `src/model.ts` will call this utility before returning the API key, removing the TODO comment.

## Architecture

### File Structure
- **New file**: `src/utils/apiKeyRotation.ts`
- **Modified file**: `src/model.ts`

### Core Components

**`rotateApiKey(apiKey: string): string`**
- Main exported function
- Returns a single API key string

**Module-level state**:
- `currentIndex: number` - Counter starting at 0

### Implementation Flow

1. Check if `apiKey` contains a comma
2. If no comma: return `apiKey` unchanged
3. If comma exists:
   - Split by comma
   - Trim whitespace from each key
   - Calculate index: `currentIndex % keyCount`
   - Select key at calculated index
   - Increment `currentIndex++`
   - Return selected key

### Integration Point

In `src/model.ts`, modify `getProviderApiKey()`:
```typescript
function getProviderApiKey(provider: Provider) {
  const apiKey = (() => {
    if (provider.options?.apiKey) {
      return provider.options.apiKey;
    }
    const envs = provider.env || [];
    for (const env of envs) {
      if (process.env[env]) {
        return process.env[env];
      }
    }
    return '';
  })();
  
  return rotateApiKey(apiKey);
}
```

### Edge Cases Handled

- **Empty string**: Return as-is
- **Single key (no comma)**: Return unchanged
- **Whitespace around keys**: Trim each key after split
- **Counter overflow**: JavaScript numbers handle safely, modulo keeps bounded
- **Empty array after split**: Returns empty string

### State Behavior

- Counter persists for application lifetime
- Resets to 0 on process restart
- Shared globally across all providers (trade-off of Option A)
- No explicit persistence across restarts

### Testing Strategy

**Unit tests** (`src/utils/apiKeyRotation.test.ts`):
- Single key without comma returns unchanged
- Multiple keys rotate in sequence
- Whitespace is trimmed from keys
- Rotation wraps around after reaching end
- Empty string handling

**Integration verification**:
- Existing callers of `getProviderApiKey()` remain unchanged
- No breaking changes to public API
- Manual test: Set environment variable with comma-separated keys, verify rotation through logs

### Error Handling

- No explicit error throwing needed (defensive programming)
- TypeScript types prevent null/undefined input
- Function is pure except for counter increment side effect
- Invalid inputs (e.g., only commas) gracefully return empty string
