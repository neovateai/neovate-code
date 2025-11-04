# Golden Border for High Thinking Effort

**Date:** 2025-11-04
**Status:** Implemented

## Overview

Add a golden border color to the ChatInput component when thinking effort is set to `'high'`. This provides a clear visual indicator that the AI is operating at maximum thinking capacity.

## Requirements

1. Display golden border on ChatInput when `thinking.effort === 'high'`
2. Display golden color for thinking indicator in StatusLine when `thinking.effort === 'high'`
3. Golden border takes priority over mode-specific colors (memory/bash)
4. Use golden hex color `#FFC046`
5. Integrate with existing border color system

## Architecture

### Priority-Based Color Selection

The design uses a **priority-based approach** where thinking at high effort overrides all other visual states. This reflects the importance of the thinking indicator.

**Color Priority Order:**
1. **Highest:** `thinking.effort === 'high'` → Golden (`#FFC046`)
2. **High:** `mode === 'memory'` → Cyan
3. **Medium:** `mode === 'bash'` → Magenta
4. **Default:** Normal mode → Gray

### Data Flow

```
Store (thinking state)
  ↓
ChatInput component (destructure thinking)
  ↓
borderColor useMemo (priority check)
  ↓
Border UI elements (Text components with color)
```

## Implementation

### Constants Addition

**Location:** `src/ui/constants.ts`

Added new color constants to `UI_COLORS`:

```typescript
export const UI_COLORS = {
  // ... existing colors
  CHAT_BORDER: 'gray',
  CHAT_BORDER_MEMORY: 'cyan',
  CHAT_BORDER_BASH: 'magenta',
  CHAT_BORDER_THINKING: 'gray',         // New: Gray for low/medium thinking
  CHAT_BORDER_THINKING_HARD: '#FFC046', // New: Golden for high thinking
  // ...
} as const;
```

**Color Choices:** 
- `CHAT_BORDER_THINKING` (`gray`): Used for low/medium thinking effort levels, maintaining consistency with the default border
- `CHAT_BORDER_THINKING_HARD` (`#FFC046`): A warm golden color for high thinking effort, providing strong visual contrast while remaining distinct from the cyan (memory) and magenta (bash) mode colors

### ChatInput Component Changes

**Location:** `src/ui/ChatInput.tsx`

#### Step 1: Destructure Thinking State

Added `thinking` to the store destructuring (line ~27):

```typescript
const {
  log,
  setExitMessage,
  planResult,
  cancel,
  slashCommandJSX,
  approvalModal,
  memoryModal,
  queuedMessages,
  status,
  setStatus,
  showForkModal,
  forkModalVisible,
  bashBackgroundPrompt,
  bridge,
  thinking,  // Added
} = useAppStore();
```

#### Step 2: Update Border Color Logic

Modified the `borderColor` useMemo to check thinking first (line ~127):

```typescript
const borderColor = useMemo(() => {
  if (thinking?.effort === 'high') return UI_COLORS.CHAT_BORDER_THINKING_HARD;
  if (mode === 'memory') return UI_COLORS.CHAT_BORDER_MEMORY;
  if (mode === 'bash') return UI_COLORS.CHAT_BORDER_BASH;
  return UI_COLORS.CHAT_BORDER;
}, [thinking, mode]);
```

**Key Design Decisions:**

1. **Optional Chaining:** Uses `thinking?.effort` to safely handle `undefined` when thinking is disabled
2. **Dependency Array:** Added `thinking` alongside existing `mode` dependency
3. **Priority Order:** Thinking check comes first, ensuring it always takes precedence

### StatusLine Component Changes

**Location:** `src/ui/StatusLine.tsx`

#### Step 1: Import UI_COLORS

Added `UI_COLORS` import to access the golden color constant:

```typescript
import { UI_COLORS } from './constants';
```

#### Step 2: Update ThinkingIndicator Color Logic

Modified the `ThinkingIndicator` component to use appropriate colors for effort levels:

```typescript
function ThinkingIndicator() {
  const { thinking } = useAppStore();

  if (!thinking) return null;

  const color = thinking.effort === 'high' ? UI_COLORS.CHAT_BORDER_THINKING_HARD : UI_COLORS.CHAT_BORDER_THINKING;

  return (
    <>
      {' | '}
      <Text color={color}>thinking: {thinking.effort}</Text>
    </>
  );
}
```

**Color Logic:**
- `effort === 'high'` → Golden (`CHAT_BORDER_THINKING_HARD`: `#FFC046`)
- `effort === 'low'` or `'medium'` → Gray (`CHAT_BORDER_THINKING`: `gray`)

## Visual Behavior

### ChatInput Border Colors

| Condition | Border Color | Hex/Name |
|-----------|--------------|----------|
| thinking.effort === 'high' | Golden | `#FFC046` |
| mode === 'memory' (no high thinking) | Cyan | `cyan` |
| mode === 'bash' (no high thinking) | Magenta | `magenta` |
| Default mode | Gray | `gray` |

### StatusLine Thinking Indicator Colors

| Thinking Effort | Text Color | Hex/Name |
|-----------------|------------|----------|
| high | Golden | `#FFC046` |
| medium | Gray | `gray` |
| low | Gray | `gray` |

### Example Scenarios

1. **High Thinking + Memory Mode:**
   - ChatInput Border: Golden (thinking takes priority)
   - StatusLine: `[model | thinking: high]` in golden
   
2. **Low/Medium Thinking + Bash Mode:**
   - ChatInput Border: Magenta (mode color shown)
   - StatusLine: `[model | thinking: low]` or `[model | thinking: medium]` in gray
   
3. **No Thinking + Default Mode:**
   - ChatInput Border: Gray (default)
   - StatusLine: No thinking indicator shown

## User Experience

Users can now:
- **Quickly identify** when AI is at maximum thinking capacity via golden border on ChatInput
- **See consistent golden color** in both ChatInput border and StatusLine thinking indicator
- **Toggle thinking levels** with `Ctrl+.` and see immediate visual feedback in both components
- **Understand** that golden color indicates intensive reasoning is active

## Integration Points

This feature integrates with:
- **Thinking Toggle:** `Ctrl+.` cycles through effort levels (from existing thinking-ui design)
- **Status Line:** Shows current thinking level alongside model info
- **Store State:** Reads from centralized `thinking` state in Zustand store

## Future Enhancements

Potential improvements:
- Add border colors for `medium` effort (e.g., yellow/amber)
- Add subtle animation/pulse for high thinking state
- Show tooltip explaining the golden border on hover
- Persist border preference in user settings
