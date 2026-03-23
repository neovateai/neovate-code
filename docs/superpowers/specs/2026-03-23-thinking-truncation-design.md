# Thinking Component Truncation Design

## Problem

The `Thinking` component in `src/ui/Messages.tsx` displays all reasoning/thinking text from the LLM without any truncation. When the model produces long reasoning content, it takes up excessive screen space and distracts from the actual response.

## Solution

Add truncation logic to the `Thinking` component: default to showing at most 2 lines, with a hint to press `ctrl+o` (transcript mode) to see the full content.

## Design

### What Changes

**File**: `src/ui/Messages.tsx` — `Thinking` component only.

**Imports**: `useAppStore` is already imported in the file; `useMemo` is already imported from React.

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
2. Use `useMemo` with dependencies `[text, transcriptMode]` to compute truncation:
   - Split `text` by `\n` into `lines`
   - If `transcriptMode || lines.length <= 2`, show all content
   - Otherwise, show `lines.slice(0, 2).join('\n')` and compute `hiddenCount = lines.length - 2`
3. When truncated, render a separate `<Text>` hint element below the content
4. Truncated text maintains existing `color="gray" italic` styling

### Truncation Hint Style

Rendered as a separate `<Text>` element (not counted as part of the 2 visible lines). Reuses the same style as `ExpandableOutput`:
```tsx
<Text color="gray" dimColor>
  ... {hiddenCount} more line{hiddenCount === 1 ? '' : 's'} hidden (Press ctrl+o to expand) ...
</Text>
```

### Edge Cases

- **Empty or whitespace-only text**: Render nothing (return early or render empty)
- **Trailing newlines**: `"line1\nline2\n".split('\n')` produces `["line1", "line2", ""]`. The empty trailing element is included in the count — this is acceptable since `ExpandableOutput` follows the same behavior
- **Exactly 2 lines**: Show full content, no hint
- **Single line**: Show full content, no hint

### Data Flow

```
text (string)
  → useMemo([text, transcriptMode])
    → split('\n') → lines[]
    → transcriptMode || lines.length <= 2 ? { displayText: text, shouldTruncate: false }
                                           : { displayText: lines.slice(0, 2).join('\n'), hiddenCount, shouldTruncate: true }
  → render <Text color="gray" italic>{displayText}</Text>
  → if shouldTruncate → render hint <Text> below
```

### What Does NOT Change

- `ExpandableOutput` component — no modifications
- `ctrl+o` / `transcriptMode` toggle logic in `App.tsx` — no modifications
- `DiffViewer` component — no modifications
- No new files created

### Constants

- Max lines value `2` is used inline within the `useMemo` computation (consistent with how `ExpandableOutput` uses its `maxLines` prop default)

## Testing

- Verify thinking content with 0 or 1 line renders fully without hint
- Verify thinking content with exactly 2 lines renders fully without hint
- Verify thinking content with 3+ lines shows only 2 lines + hint
- Verify the hint text matches: `... N more lines hidden (Press ctrl+o to expand) ...`
- Verify pressing `ctrl+o` (transcript mode) shows full thinking content
- Verify pressing `ctrl+o` again (or Escape) returns to truncated view
- Verify empty text renders nothing or an empty box
