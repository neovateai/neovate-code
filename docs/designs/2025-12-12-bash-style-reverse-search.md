# Bash-Style Reverse Search Refactor

**Date:** 2025-12-12

## Context

The current reverse search feature (Ctrl+R) has a UX problem: when reverse search is active, cursor navigation shortcuts like Ctrl+A (start of line), Ctrl+E (end of line), and arrow keys don't work. This is because the cursor position changes are completely blocked in search mode, with the cursor forced to the end of the search query.

The goal is to refactor the reverse search feature to align with terminal (Bash/Zsh) UX, providing a familiar and intuitive experience for developers.

## Discussion

### Terminal Style Selection
Three terminal styles were considered:
- **Bash/Zsh style (Ctrl+R)** - Inline display with mode-based behavior ✅ Selected
- **Fish shell style** - Integrated history filtering with up/down arrows
- **Fzf-style fuzzy finder** - Full dropdown with all matches visible

### UI Display Format
Options explored:
- Keep current dropdown UI with fixed keyboard behavior
- **Switch to inline display** like bash: `(reverse-i-search)'query': matched_command` ✅ Selected
- Hybrid approach with dropdown but bash-style keyboard behavior

### No-Match Behavior
Options explored:
- Bash default with "failed" indicator and beep
- **Silent** - Just show empty command area with no special indication ✅ Selected
- Explicit "[no match]" message

### Implementation Approach
Three approaches were considered:
- Single Input with Mode Switch - minimal changes but tricky cursor handling
- **Separate Search TextInput** - clean separation, dedicated input for search ✅ Selected
- Virtual Display Layer - least invasive but confusing state management

## Approach

Implement a **Separate Search TextInput** architecture where:
- When reverse search is active, render a completely different layout
- A dedicated `TextInput` handles the search query with full cursor support
- The matched command displays inline as read-only text
- Ctrl+A/E/arrow keys trigger a two-step action: exit search mode, then apply cursor movement

This provides clean separation of concerns and allows the search query input to have normal cursor behavior.

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ (reverse-i-search)'          │ matched_command_here             │
│                    ↑         │                                  │
│            SearchTextInput   │   MatchDisplay (Text)            │
│            (editable)        │   (read-only)                    │
└─────────────────────────────────────────────────────────────────┘
```

### New Component: ReverseSearchInput

A new component that wraps:
- Prefix label: `(reverse-i-search)'`
- A `TextInput` for the search query (cursor lives here, Ctrl+A/E work normally within query)
- Closing quote: `':`
- A `Text` component showing the current matched command

### Keyboard Behavior

**In reverse search mode:**

| Key | Action |
|-----|--------|
| Typing | Updates search query, auto-finds latest match |
| `Ctrl+R` | Cycle to next (older) match |
| `Ctrl+S` | Cycle to previous (newer) match |
| `Enter` / `Tab` | Exit search, set main input to matched command, cursor at end |
| `Escape` | Exit search, discard match, return to original input |
| `Ctrl+A/E`, Arrows | Exit search, set input to match, then apply cursor action |

### Exit with Action Callback

```typescript
onExitWithAction: (match: string, action: 'start' | 'end' | 'left' | 'right') => void
```

This enables the two-step exit behavior for cursor movement keys.

### Data Flow

```
useInputHandlers
  ├── reverseSearchActive: boolean
  ├── handleReverseSearch() → sets active = true
  └── handleReverseSearchExit(match, cursorAction?) →
        sets inputState.value = match
        sets active = false
        applies cursorAction if provided
          │
          ▼
ChatInput
  if (reverseSearchActive)
     render <ReverseSearchInput />
  else
     render <TextInput /> (current behavior)
          │
          ▼
ReverseSearchInput (NEW)
  ├── Uses useReverseHistorySearch hook
  ├── Renders: prefix + TextInput(query) + ':' + matchDisplay
  └── Handles: Ctrl+R/S cycling, exit triggers
```

### Files to Modify

1. `useInputHandlers.ts` - Add `handleReverseSearchExit(match, cursorAction)`
2. `ChatInput.tsx` - Conditional render, remove dropdown UI for reverse search
3. **New file**: `ReverseSearchInput.tsx` - The inline search component
4. `useReverseHistorySearch.ts` - Minor tweaks for cursor action support

### Visual Styling

```
(reverse-i-search)'query': matched_command_here
        ↑              ↑    ↑
      dimColor       dimColor   normal color
```

- Prefix and quotes: dimmed color
- Query: has cursor (inverted character)
- Matched command: normal color (stands out)

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty history | Enter search mode, show empty match area |
| No match for query | Show empty match area (silent) |
| Match found, then query changes to no-match | Clear match display |
| Exit with no match (Enter/Tab) | Exit search, keep original input unchanged |
| Ctrl+A/E with no match | Exit search, keep original input, apply cursor action |

### What Gets Removed

- The `<Suggestion>` dropdown rendering for `reverseSearch.matches` in `ChatInput.tsx` (lines 255-280)
- `reverseSearch.placeholderText` no longer needed
