# Skill Command UI Minimal Redesign

## Problem Statement

The current `skill.tsx` command has verbose UI patterns that feel inconsistent with a minimal/clean aesthetic:
- "Press Esc to exit..." prompts after every operation
- Unnecessary keyboard handling for simple exit flows
- Extra spacing in list view

## Design Goals

1. **Remove all exit prompts** - Auto-exit on completion
2. **Simplify keyboard handling** - Remove `useInput` hooks where not needed
3. **Tighter list layout** - Reduce spacing for cleaner appearance
4. **Consistent timing** - Success: 1-1.5s delay, Error: 2s delay

## Changes by Component

### AddSkillUI

**Remove:**
- `useInput` hook
- `shouldExit` state tracking

**Modify:**
- Error state: Add 2s auto-exit via `setTimeout(() => process.exit(0), 2000)`
- Keep existing success behavior (1.5s delay already implemented)

**Before:**
```tsx
if (state.phase === 'error') {
  return (
    <Box flexDirection="column">
      <Text color="red">✗ Error: {state.error}</Text>
      <Text dimColor>Press any key to exit...</Text>
    </Box>
  );
}
```

**After:**
```tsx
if (state.phase === 'error') {
  return <Text color="red">✗ Error: {state.error}</Text>;
}
```

### SkillListUI

**Remove:**
- `useInput` hook
- `shouldExit` state tracking
- "Press Esc to exit..." text from empty state
- "Press Esc to exit..." text from loaded state
- `marginBottom={1}` from separator row

**Add:**
- `useEffect` to exit immediately after render when in 'done' state:
  ```tsx
  useEffect(() => {
    if (state.phase === 'done' || state.phase === 'error') {
      process.exit(0);
    }
  }, [state.phase]);
  ```

**Empty state simplified:**
```tsx
// Before
<Box flexDirection="column">
  <Text dimColor>No skills installed.</Text>
  <Text dimColor>Press Esc to exit...</Text>
</Box>

// After
<Text dimColor>No skills installed.</Text>
```

**List view simplified:**
- Remove the `marginTop={1}` box with exit hint at bottom
- Remove `marginBottom={1}` from separator for tighter spacing

### RemoveSkillUI

**Remove:**
- `useInput` hook
- `shouldExit` state tracking

**Modify:**
- Error state: Add 2s auto-exit
- Keep existing success behavior (1s delay already implemented)

## Implementation Notes

1. All three components become purely display-focused with no interactivity
2. The `useInput` import can be removed from the file
3. Simplify state types: remove phases that tracked exit intention
4. Consider using a shared `useAutoExit(delay: number)` hook if pattern is common elsewhere

## Testing

After implementation:
- `neovate skill list` - Should display and exit immediately
- `neovate skill list` (no skills) - Should show "No skills installed." and exit
- `neovate skill add user/repo` - Should show progress, result, exit after 1.5s
- `neovate skill remove name` - Should show result and exit after 1s
- Error cases - Should display error and exit after 2s
