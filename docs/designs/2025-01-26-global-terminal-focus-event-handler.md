# Global Terminal Focus Event Handler

**Date:** 2025-01-26

## Context

When terminal focus reporting is enabled via `\x1b[?1004h`, terminals send escape sequences `\x1b[I` (focus gained) and `\x1b[O` (focus lost) to indicate window focus changes. Ink strips the `\x1b` prefix, leaving `[I` and `[O` as input strings.

The issue was that these escape sequences were appearing as literal text `[I` in the chat input field, particularly when clicking/focusing the terminal window while a modal (approval, ask question, fork) was displayed.

## Discussion

**Root Cause Analysis:**

1. Focus reporting is enabled globally in `ChatInput.tsx`:
   ```tsx
   process.stdout.write('\x1b[?1004h');
   ```

2. The handler for `[I`/`[O` was inside `TextInput`'s `wrappedOnInput` function, passed to `useInput`:
   ```tsx
   useInput(wrappedOnInput, { isActive: focus });
   ```

3. When `focus={false}` (during modals), the `useInput` hook is inactive, so `wrappedOnInput` never runs.

4. The unhandled escape sequences leak through and get inserted as literal text.

**Reproduction Scenarios:**
- Approval modal is open
- AskQuestionModal is showing
- ForkModal is active
- Any state where `TextInput` has `focus={false}`

...and then clicking/focusing the terminal window.

**Fix Options Considered:**

1. **Move focus tracking to a global level** - Handle `[I`/`[O` in a separate always-active `useInput` hook
2. **Filter at stdin level** - Strip these sequences before they reach any input handler

Option 1 was chosen as it's simpler and follows the existing pattern used in `AskQuestionModal.tsx`.

## Approach

Add a global always-active `useInput` hook in `ChatInput.tsx` (where focus reporting is enabled) to intercept focus events regardless of which component has focus. Keep a simplified handler in `TextInput` as a safety net.

## Architecture

**Changes to `ChatInput.tsx`:**
- Import `useInput` from ink
- Add global focus event handler with `isActive: true`:
  ```tsx
  useInput(
    (input) => {
      if (input === '[I' || input === '[O') {
        useAppStore.getState().setWindowFocused(input === '[I');
      }
    },
    { isActive: true },
  );
  ```

**Changes to `TextInput/index.tsx`:**
- Simplify the focus event handling to just skip the sequences:
  ```tsx
  if (input === '[I' || input === '[O') {
    return;
  }
  ```
- Remove unused `useAppStore` import

**Existing handlers:**
- `AskQuestionModal.tsx` already has its own focus handler with `isActive: true`, providing coverage when that modal is rendered
- The global handler in `ChatInput.tsx` ensures coverage for all other cases (approval modal, fork modal, etc.)

**Key Principle:** Focus reporting is enabled in `ChatInput.tsx`, so the handler should also be in `ChatInput.tsx` with `isActive: true` to ensure the events are always caught.
