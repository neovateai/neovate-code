# DiffViewer Markdown Rendering for New Files

**Date:** 2026-01-09

## Context

When creating new `.md` files, the `DiffViewer` component displays raw markdown source code with syntax highlighting (e.g., `# hello`) instead of rendering it as formatted markdown. Users expect to see the rendered markdown output (formatted headings, lists, etc.) for a better preview experience.

The existing `Markdown` component in `src/ui/Markdown.tsx` already provides proper markdown rendering using `marked` and `marked-terminal`, but it's not utilized in the diff view for new files.

## Discussion

### Rendering Scope
- **Decision:** Only render markdown for newly created `.md` files
- Modified/existing files should continue showing diff view to preserve change visibility

### Implementation Approaches

**Option A: Internal Detection in CodeHighlightRenderer**
- Detect `.md` files inside `CodeHighlightRenderer` and switch to `Markdown` component
- Pros: Centralized change
- Cons: Violates single responsibility principle

**Option B: Entry Point Branching (Selected)**
- Add branching logic at `DiffViewer` entry point before calling renderers
- Pros: Clear separation of concerns, `CodeHighlightRenderer` stays focused on code highlighting
- Cons: Additional branch in main component

Both approaches have similar complexity (~10-20 lines of code changes).

## Approach

Implement Option B: Add entry point branching in `DiffViewer` component to detect new `.md` files and route them to a dedicated `MarkdownRenderer` component that uses the existing `Markdown` component for rendering.

## Architecture

### Control Flow

```
DiffViewer
  ├── isNewFile(diffLines) && useCodeHighlight?
  │   ├── isMarkdownFile(fileName)? → MarkdownRenderer (new)
  │   └── else → CodeHighlightRenderer (existing)
  └── else → RenderDiffContent (existing diff view)
```

### New Components

**`isMarkdownFile(fileName?: string): boolean`**
- Helper function to check if file extension is `.md`

**`MarkdownRenderer`**
- Similar structure to `CodeHighlightRenderer`
- Uses `Markdown` component for content rendering
- Preserves file header with name and line count (`+N new file`)
- Preserves truncation logic for long content

### Data Flow

```
DiffViewer
  ↓ Detect new file + .md extension
  ↓ extractNewFileContent()
  ↓
MarkdownRenderer
  ↓ Calculate line statistics
  ↓
Markdown component (from ./Markdown.tsx)
  ↓ marked + marked-terminal rendering
  ↓
Terminal output (formatted markdown)
```

### File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/ui/DiffViewer.tsx` | Modify | Add `MarkdownRenderer`, `isMarkdownFile()`, entry branching logic |

### Estimated Code

~40-50 lines of new code in `DiffViewer.tsx`.
