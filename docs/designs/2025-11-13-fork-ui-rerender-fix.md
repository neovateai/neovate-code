# Fork UI Re-render Fix

**Date:** 2025-11-13

## Context

When users select a message to fork from the fork modal (especially the first message), the UI doesn't properly re-render to reflect the updated message list. Instead of showing an empty or filtered message list, the UI displays stale content from before the fork operation. This creates a confusing user experience where the fork appears to have no effect.

The root cause is that React component keys in both App.tsx and Messages.tsx don't change when the fork operation updates the messages array, preventing React from detecting that a re-render is necessary.

## Discussion

Three approaches were explored to fix this re-rendering issue:

### Approach 1: Add a Fork Counter to Component Keys
- Add a `forkCounter` state that increments on every fork operation
- Include this counter in component keys to force re-renders
- **Trade-offs**: Simple, guaranteed to work, minimal code changes
- **Complexity**: Low - just add one state variable and increment it

### Approach 2: Use Messages Length in Static Key
- Include `messages.length` in the Static component's key
- **Trade-offs**: More targeted fix, doesn't force re-render of entire App
- **Complexity**: Low, but might not work in edge cases where messages.length doesn't change

### Approach 3: Force Clear and Rebuild
- Temporarily set messages to empty array, then set to filtered messages
- **Trade-offs**: More reliable, but might cause brief flicker
- **Complexity**: Medium - requires careful state update sequencing

**Decision**: Approach 1 was selected for its simplicity and reliability.

## Approach

Implement a counter-based re-rendering mechanism:

1. Add a `forkCounter` state variable to the Zustand store
2. Increment this counter every time a fork operation occurs
3. Include the counter in component keys for both App and Messages components
4. React will detect the key change and force a complete re-render
5. The Static component with the new key will render the filtered message list correctly

This guarantees that forking to any message (including the first one) will properly update the UI to show only messages up to the selected point.

## Architecture

### State Changes (src/ui/store.ts)

**Add to AppState interface:**
```typescript
forkCounter: number;
```

**Initialize in store:**
```typescript
forkCounter: 0,
```

**Add action to AppActions interface:**
```typescript
incrementForkCounter: () => void;
```

**Implement the action:**
```typescript
incrementForkCounter: () => {
  set({ forkCounter: get().forkCounter + 1 });
},
```

**Update fork() action:**
After setting the filtered messages and other state, call:
```typescript
get().incrementForkCounter();
```

### Component Updates

**App.tsx:**
- Import `forkCounter` from store
- Update Box key from `${forceRerender}-${forkParentUuid}` to `${forceRerender}-${forkParentUuid}-${forkCounter}`

**Messages.tsx:**
- Import `forkCounter` from store
- Update Static key from `${sessionId}` to `${sessionId}-${forkCounter}`

### Flow

1. User selects a message in ForkModal
2. `fork()` action is called with the target UUID
3. Messages are filtered to only include messages up to the selected point
4. State is updated (messages, forkParentUuid, inputValue, etc.)
5. `incrementForkCounter()` is called
6. React detects key changes in both App and Messages components
7. Complete re-render occurs with the filtered message list
8. UI correctly displays the forked state (empty if first message selected)
