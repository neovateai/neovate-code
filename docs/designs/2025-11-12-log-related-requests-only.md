# Log Command: Load Only Related Requests

**Date:** 2025-11-12
**Status:** Approved

## Problem

Currently, `loadAllRequestLogs` loads all `.jsonl` files from the requests directory, regardless of whether they're related to the current session. This is inefficient and can include unrelated request data.

## Key Insight

The assistant message UUID directly corresponds to the request file name (without `.jsonl` extension). We don't need timestamp-based matching - we have direct mapping.

## Solution

### Architecture Changes

**Function Signature:**
```typescript
// Before
loadAllRequestLogs(requestsDir: string)

// After
loadAllRequestLogs(requestsDir: string, messages: NormalizedMessage[])
```

### Core Logic

1. Extract all assistant message UUIDs from messages array upfront
2. Create a Set for O(1) lookup: `const assistantUuids = new Set(messages.filter(m => m.role === 'assistant').map(m => m.uuid))`
3. Filter files to only process those where `path.basename(file, '.jsonl')` exists in `assistantUuids`
4. Return same structure as before, but with filtered results

### Code Removal

**Delete `findNearestRequestForAssistant` function** (lines 115-138):
- No longer needed with direct UUID mapping
- Timestamp-based matching is removed

**Simplify `buildHtml` function:**
- Remove timestamp-based matching loop (lines ~332-340)
- Replace with direct mapping: `assistantMap[m.uuid] = m.uuid`
- The `requestData` object will already contain only matching requests

### Call Site Updates

**In `generateHtmlForSession`:**
```typescript
// Before
const requestLogs = loadAllRequestLogs(requestsDir);

// After
const requestLogs = loadAllRequestLogs(requestsDir, messages);
```

## Edge Cases

1. **Assistant message with no matching request file:**
   - UUID won't match any file
   - No request data loaded
   - HTML shows "N/A" (existing behavior)

2. **Empty messages array:**
   - Empty `assistantUuids` Set
   - No request files loaded (returns empty array)
   - HTML renders but no request details available

3. **Missing requests directory:**
   - Existing check handles this: `if (!fs.existsSync(requestsDir)) return []`

4. **Malformed .jsonl files:**
   - Existing try-catch in `readJsonlFile` handles this

## Benefits

- **Performance:** Only reads necessary request files
- **Simplicity:** Removes complex timestamp matching logic
- **Correctness:** Direct UUID mapping is more reliable than timestamp correlation
- **Maintainability:** Cleaner, easier to understand code

## Testing Approach

- Test with session containing assistant messages with matching request files
- Test with session where some assistant UUIDs don't have corresponding files
- Test with session with no assistant messages
- Verify HTML renders correctly and request details show for matched messages only

## Implementation Steps

1. Update `loadAllRequestLogs` signature and add filtering logic
2. Simplify `buildHtml` to use direct UUID mapping
3. Remove `findNearestRequestForAssistant` function
4. Update call site in `generateHtmlForSession`
5. Test with various session scenarios
