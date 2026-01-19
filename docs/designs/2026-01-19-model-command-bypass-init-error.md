# Model Command Bypass for Initialization Errors

**Date:** 2026-01-19

## Context

When a user has a misconfigured model in their configuration (e.g., an invalid provider like `xmodelwatch`), the application shows an error message but blocks ALL user input, including slash commands like `/model`, `/login`, and `/logout` that are specifically designed to help users fix their configuration.

This creates a "locked out" situation where users cannot recover from a bad model configuration without manually editing config files.

## Discussion

### Root Cause Analysis

The issue was traced to the `send` function in `src/ui/store.ts`. When `initializeModelError` is set (due to a bad model configuration), the function has an early return:

```typescript
if (initializeModelError) {
  get().setInputError(initializeModelError);
  return;  // This blocked ALL commands
}
```

This blocked:
- Regular messages (expected behavior)
- ALL slash commands including `/model` (unexpected - this prevents recovery)

### Key Questions Addressed

1. **Which commands should bypass the error check?**
   - `/model` - allows changing to a valid model
   - `/login` - allows configuring API keys for providers
   - `/logout` - allows removing invalid API keys

2. **Should `initializeModelError` be cleared after fixing the model?**
   - Yes, otherwise users would still be blocked even after selecting a valid model

3. **Where should the error be cleared?**
   - In the `setModel` action, when a model is successfully changed (targeted approach)

## Approach

1. **Bypass check for recovery commands**: Modify the `initializeModelError` check to allow `/model`, `/login`, and `/logout` commands to proceed.

2. **Clear error after successful model change**: In the `setModel` action, clear `initializeModelError` to `null` after the model is successfully updated.

3. **Add error handling**: Add `.catch()` handler to the `models.list` request in the ModelSelect component to prevent unhandled promise rejections.

## Architecture

### Modified Files

1. **`src/ui/store.ts`**
   - `send` action: Added bypass logic for recovery commands
   - `setModel` action: Clear `initializeModelError` after successful model change

2. **`src/slash-commands/builtin/model.tsx`**
   - Added `.catch()` handler for `models.list` request

### Code Changes

**Bypass logic in `send` action:**
```typescript
if (initializeModelError) {
  const bypassCommands = ['model', 'login', 'logout'];
  if (isSlashCommand(message)) {
    const parsed = parseSlashCommand(message);
    if (bypassCommands.includes(parsed.command)) {
      // Allow these commands to proceed
    } else {
      get().setInputError(initializeModelError);
      return;
    }
  } else {
    get().setInputError(initializeModelError);
    return;
  }
}
```

**Clear error in `setModel` action:**
```typescript
set({
  model: currentModel,
  modelContextLimit: currentModel?.model.limit.context || 0,
  thinking: currentModel?.thinkingConfig ? { effort: 'low' } : undefined,
  initializeModelError: null,  // Clear error after successful change
});
```

### User Flow After Fix

1. User has misconfigured model → `initializeModelError` is set
2. User types `/model` → bypass check allows it to proceed
3. Model selector modal appears with available models
4. User selects a valid model → `setModel()` is called
5. `setModel()` updates model and clears `initializeModelError`
6. User can now run normal commands
