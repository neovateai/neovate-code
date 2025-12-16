# Random API Key Rotation

## Summary

Change `rotateApiKey` from sequential rotation to random selection, avoiding consecutive duplicates.

## Current Behavior

- Uses `currentIndex` starting at 0
- Always returns keys in sequence: key1 → key2 → key3 → key1...

## New Behavior

- Each call picks a random key from the list
- Avoids picking the same key twice in a row (when 2+ keys exist)
- Single key or empty string: return unchanged

## Implementation

1. Replace `currentIndex` with `lastSelectedIndex` (initially -1 or null)
2. Generate random index using `Math.random()`
3. If random index equals last and keys.length > 1, re-roll
4. Store selected index for next call comparison

## Test Changes

- Remove tests asserting specific sequence order
- Add tests verifying:
  - Keys are from valid set
  - No consecutive duplicates (run multiple iterations)
  - Single key still works
  - Edge cases (empty, whitespace) still work
