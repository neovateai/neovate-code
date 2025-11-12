# Suggestion Component Two-Line Layout

**Date:** 2025-11-12

## Context

The Suggestion component had alignment issues where long slash command names (like `/spec2:using-git-worktrees`) caused inconsistent spacing and poor text wrapping in the dropdown. The descriptions were pushed far to the right and wrapped awkwardly, creating a visually inconsistent interface.

The component serves two distinct use cases:
1. **Slash commands** - Command name with description
2. **File search** - File paths without descriptions

## Discussion

**Initial Problem Analysis:**
- `firstColumnWidth` was calculated based only on visible suggestions using `maxNameLength + 4`
- Long command names created a fixed-width first column that pushed descriptions too far right
- Mixed-length commands resulted in inconsistent visual alignment

**Explored Approaches:**

1. **Simple Threshold** - Switch to two-line when command exceeds fixed length
   - Simple and predictable
   - Mixed layouts could look inconsistent

2. **Smart Adaptive** - Calculate based on terminal width and available space
   - Space efficient and adaptive
   - Complex calculation, behavior changes with resize

3. **Consistent Two-Line** (Selected)
   - Always use two-line layout for slash commands
   - Completely consistent visual pattern
   - Simplest implementation
   - Trade-off: uses more vertical space

**Key Decision:**
Chose Approach 3 for consistency and simplicity. The vertical space trade-off is acceptable since `maxVisible={10}` provides enough suggestions even with two-line layout.

**Refinement:**
Recognized that file search suggestions should remain single-line since they don't have descriptions. Added a `variant` prop to handle both use cases elegantly.

## Approach

Introduce a `variant` prop to `SuggestionItem` with two modes:
- `'two-line'` for slash commands - name on first line, description indented on second
- `'single-line'` for file suggestions - original horizontal layout

Remove the complex `firstColumnWidth` calculation entirely, simplifying both the component and its usage.

## Architecture

**Component Changes:**

`SuggestionItem` in `src/ui/Suggestion.tsx`:
- Add `variant?: 'single-line' | 'two-line'` prop (default: `'single-line'`)
- Two-line variant: Use `flexDirection="column"` with `marginLeft={2}` for description indentation
- Single-line variant: Use `flexDirection="row"` with simple text concatenation
- Keep conditional rendering for empty descriptions

**Usage Changes in `ChatInput.tsx`:**

Slash commands:
- Remove `visibleSuggestions` from render function
- Remove `maxNameLength` calculation
- Add `variant="two-line"` to `SuggestionItem`

File suggestions:
- Remove `visibleSuggestions` from render function  
- Remove `maxNameLength` calculation
- Use `variant="single-line"` (or omit, as it's the default)

**No changes needed:**
- `Suggestion` container component logic
- Scrolling/windowing behavior
- Selection highlighting
- Terminal width handling (Ink handles text wrapping automatically)
