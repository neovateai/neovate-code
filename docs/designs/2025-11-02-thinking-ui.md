# Thinking Status UI Design

**Date:** 2025-11-02
**Status:** Approved

## Overview

Add a thinking status indicator to the StatusLine that can be toggled with `Ctrl+.`. The thinking state cycles between `undefined`, `{ effort: 'low' }`, `{ effort: 'medium' }`, and `{ effort: 'high' }`. For Google and Anthropic providers, thinking is initialized to `{ effort: 'low' }` by default.

## Requirements

1. Add thinking status display to StatusLine after the model name
2. Toggle thinking state with `Ctrl+.` keyboard shortcut
3. Cycle through 4 states: `undefined` → `low` → `medium` → `high` → `undefined`
4. Initialize with `{ effort: 'low' }` for Google and Anthropic providers
5. Display format: `[model | thinking: low]` (when active)

## Architecture

### State Structure

**Location:** `src/ui/store.ts`

Add new state field to `AppState`:

```typescript
interface AppState {
  // ... existing fields
  thinking: { effort: 'low' | 'medium' | 'high' } | undefined;
}
```

### Store Actions

#### Toggle Action

Add new action to `AppActions`:

```typescript
interface AppActions {
  // ... existing actions
  toggleThinking: () => void;
}
```

Implementation:

```typescript
toggleThinking: () => {
  const current = get().thinking;
  let next: { effort: 'low' | 'medium' | 'high' } | undefined;

  if (!current) {
    next = { effort: 'low' };
  } else if (current.effort === 'low') {
    next = { effort: 'medium' };
  } else if (current.effort === 'medium') {
    next = { effort: 'high' };
  } else {
    next = undefined;
  }

  set({ thinking: next });
}
```

#### Initialization Logic

In the `initialize` action (around line 266-282), detect provider and set initial thinking state:

```typescript
const providerId = response.data.model?.split('/')[0];
const shouldEnableThinking = providerId === 'google' || providerId === 'anthropic';

set({
  // ... existing state
  thinking: shouldEnableThinking ? { effort: 'low' } : undefined,
});
```

#### Model Change Logic

In the `setModel` action (around line 820-838), reset thinking state based on new model's provider:

```typescript
setModel: async (model: string) => {
  // ... existing logic

  // Determine provider and set thinking
  const providerId = model?.split('/')[0];
  const shouldEnableThinking = providerId === 'google' || providerId === 'anthropic';

  set({
    model,
    modelContextLimit: modelsResponse.data.currentModelInfo.modelContextLimit,
    thinking: shouldEnableThinking ? { effort: 'low' } : undefined,
  });
}
```

### Provider ID Detection

Provider ID is extracted from the model string using:

```typescript
const providerId = model?.split('/')[0];
```

Example:
- `"google/gemini-2.0-flash-exp"` → `"google"`
- `"anthropic/claude-3-5-sonnet-20241022"` → `"anthropic"`
- `null` or `undefined` → `undefined`

## Keyboard Shortcut

**Location:** `src/ui/TextInput/hooks/useTextInput.ts`

Add handler to the `handleCtrl` map (around line 200-222):

```typescript
const handleCtrl = mapInput([
  // ... existing handlers
  ['.', () => {
    get().toggleThinking();
    return cursor;
  }],
]);
```

Note: Will need to import `useAppStore` at the top of the file.

## UI Display

**Location:** `src/ui/StatusLine.tsx`

### ThinkingIndicator Component

Add new component before `StatusMain`:

```typescript
function ThinkingIndicator() {
  const { thinking } = useAppStore();

  if (!thinking) return null;

  return (
    <>
      {' | '}
      <Text color="cyan">thinking: {thinking.effort}</Text>
    </>
  );
}
```

### StatusMain Integration

Update the status line display (around line 103-104) to include thinking indicator:

```typescript
function StatusMain() {
  const {
    cwd,
    model,
    modelContextLimit,
    status,
    exitMessage,
    messages,
    sessionId,
    approvalMode,
    thinking, // Add this
  } = useAppStore();

  // ... existing code

  return (
    <Box>
      <Text color="gray">
        [{model ? model : <Text color="red">use /model to select a model</Text>}
        {thinking && (
          <>
            {' | '}
            <Text color="cyan">thinking: {thinking.effort}</Text>
          </>
        )}
        ] | {folderName} | {(tokenUsed / 1000).toFixed(1)}K |{' '}
        <Text color={getContextLeftColor(contextLeftPercentage)}>
          {contextLeftPercentage}%
        </Text>{' '}
        {approval}
      </Text>
    </Box>
  );
}
```

Visual examples:
- No thinking: `[google/gemini-2.0-flash-exp] | folder | 10.5K | 80%`
- With thinking: `[google/gemini-2.0-flash-exp | thinking: low] | folder | 10.5K | 80%`

## Message Integration

**Location:** `src/ui/store.ts`

Update the `sendMessage` action (around line 653-664) to pass thinking state:

```typescript
const response: LoopResult = await bridge.request('session.send', {
  message: opts.message,
  cwd,
  sessionId,
  planMode: opts.planMode,
  model: opts.model,
  attachments,
  parentUuid: get().forkParentUuid || undefined,
  thinking: get().thinking, // Add this line
});
```

The thinking config will be processed by the backend using the existing `getThinkingConfig` function in `src/thinking-config.ts`.

## State Lifecycle

1. **Initialization**: Set to `{ effort: 'low' }` for Google/Anthropic, `undefined` otherwise
2. **Toggle**: Cycles through states with `Ctrl+.`
3. **Model Change**: Reset based on new model's provider
4. **Session Resume**: Will be `undefined` initially (could be enhanced later to persist)
5. **Message Send**: Current state is passed to the backend

## Future Enhancements

- Persist thinking state in session config
- Show visual feedback when toggling (toast message)
- Add keyboard shortcut hint in help text
- Support more providers as they add thinking capabilities
