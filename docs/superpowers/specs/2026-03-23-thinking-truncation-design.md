# Thinking Component Truncation Design

## Problem

The `Thinking` component in `src/ui/Messages.tsx` displays all reasoning/thinking text from the LLM without any truncation. When the model produces long reasoning content, it takes up excessive screen space and distracts from the actual response.

## Solution

Add truncation logic to the `Thinking` component: default to showing at most 2 lines, with a hint to press `ctrl+o` (transcript mode) to see the full content.

## Design

### What Changes

**File**: `src/ui/Messages.tsx` — `Thinking` component only.

### Current Implementation

```tsx
function Thinking({ text }: { text: string }) {
  return (
    <Box flexDirection="column" marginTop={SPACING.MESSAGE_MARGIN_TOP}>
      <Text bold color="gray">thinking</Text>
      <Text color="gray" italic>{text}</Text>
    </Box>
  );
}
```

### New Implementation

1. Read `transcriptMode` from `useAppStore()`
2. Split `text` by `\n` into lines
3. If `!transcriptMode && lines.length > 2`, show only the first 2 lines
4. When truncated, show a hint line: `... N more lines hidden (Press ctrl+o to expand) ...`
5. When `transcriptMode` is true, show all content (existing behavior)

### Truncation Hint Style

Reuse the same style as `ExpandableOutput`:
```tsx
<Text color="gray" dimColor>
  ... {hiddenCount} more line{hiddenCount === 1 ? '' : 's'} hidden (Press ctrl+o to expand) ...
</Text>
```

### Data Flow

```
text (string)
  → split('\n') → lines[]
  → transcriptMode ? all lines : lines.slice(0, 2)
  → join('\n') → render
  → if truncated → render hint line
```

### What Does NOT Change

- `ExpandableOutput` component — no modifications
- `ctrl+o` / `transcriptMode` toggle logic in `App.tsx` — no modifications
- `DiffViewer` component — no modifications
- No new files created

### Constants

- `DEFAULT_THINKING_MAX_LINES = 2` — defined locally in the component via `useMemo`

## Testing

- Verify thinking content with <= 2 lines renders fully without hint
- Verify thinking content with > 2 lines shows only 2 lines + hint
- Verify pressing `ctrl+o` (transcript mode) shows full thinking content
- Verify pressing `ctrl+o` again (or Escape) returns to truncated view
