# Log Command: Show Detailed Tool Information

**Date:** 2025-11-12  
**Status:** Design Complete

## Overview

Enhance the log command (`src/commands/log.ts`) to display detailed tool call and result information in the left panel with visual hierarchy through indentation. Additionally, remove the "showing first 5 chunks" limitation to show all chunks in the right panel.

## Problem Statement

Currently, the log viewer shows messages in the left panel and request details in the right panel. Tool calls and results are hidden within the raw JSON, making it difficult to see:
- Which tools were called by each assistant message
- What parameters were passed to each tool
- What results each tool returned
- The execution flow and sequence of tool calls

## Design

### 1. Architecture & Data Flow

**Core Architecture:**
Modify the `buildHtml` function to generate an enriched message list that includes tool calls and results as separate, indented blocks.

**Data Flow:**
1. Process messages and identify assistant messages with tool_use content
2. For each tool_use part, create an indented "tool call" block showing tool name and input parameters
3. Scan subsequent messages for matching tool_result parts (match by tool call ID)
4. For each matching result, create an indented "tool result" block showing output/error
5. Insert blocks in chronological order between assistant message and next user message

**Key Data Structures:**
```typescript
type RenderableItem = 
  | { type: 'message'; message: NormalizedMessage; indent: false }
  | { type: 'tool-call'; indent: true; id: string; name: string; input: Record<string, any> }
  | { type: 'tool-result'; indent: true; id: string; name: string; result: ToolResult };
```

**Processing Logic:**
Build a flat array of renderable items by iterating through messages once, expanding assistant messages that contain tool_use into multiple renderable blocks.

### 2. HTML Generation & Styling

**HTML Structure:**
```
Assistant message (normal)
  ├─ Tool Call block (indented, shows tool name + inputs)
  ├─ Tool Result block (indented, shows output)
  ├─ Tool Call block (indented)
  └─ Tool Result block (indented)
User message (normal)
```

**CSS Additions:**
- `.msg.tool-call` - Styling for tool call blocks (amber/yellow background)
- `.msg.tool-result` - Styling for tool result blocks (light green for success, light red for errors)
- `.msg.indented` - Left margin/padding for visual hierarchy (`margin-left: 32px`)
- `.msg.tool-call .label`, `.msg.tool-result .label` - Bold labels like "🔧 Tool Call: read" or "✓ Tool Result: read"

**Content Formatting:**
- Tool call input: Pretty-printed JSON in `<pre><code>` blocks
- Tool result:
  - Success: Show result content (text or JSON for structured data)
  - Error: Show error message in red text
  - Both displayed in `<pre>` blocks for readability

### 3. Tool Call & Result Matching Logic

**Extraction Process:**

1. **Identify Tool Calls:**
   - Iterate through messages
   - Find assistant messages with array content
   - Filter for parts where `part.type === 'tool_use'`
   - Extract `{ id, name, input }` for each

2. **Find Matching Results:**
   - For each tool call ID, scan forward through subsequent messages
   - Look for messages with `role === 'user'` or `role === 'tool'`
   - Find content arrays containing:
     - `{ type: 'tool_result', id: X }` OR
     - `{ type: 'tool-result', toolCallId: X }`
   - Match by ID equality

3. **Build Renderable Sequence:**
   - Start with assistant message
   - Add all its tool calls (sorted by appearance in content array)
   - For each tool call, immediately follow with its result if found
   - If no result found, show "incomplete" indicator

**Edge Cases:**
- Tool calls without results: Show as "incomplete" with grey/muted styling
- Multiple tool calls in one assistant message: All shown in order with proper indentation
- Tool results that appear out of order: Match by ID, not position

**Example Output:**
```javascript
renderableItems = [
  { type: 'message', message: assistantMsg, indent: false },
  { type: 'tool-call', indent: true, id: 'call_123', name: 'read', input: { file_path: 'foo.ts' } },
  { type: 'tool-result', indent: true, id: 'call_123', name: 'read', result: { type: 'text', content: '...' } },
  { type: 'tool-call', indent: true, id: 'call_124', name: 'edit', input: { file_path: 'foo.ts', ... } },
  { type: 'tool-result', indent: true, id: 'call_124', name: 'edit', result: { type: 'success' } },
]
```

### 4. Implementation Details

**Key Changes:**

1. **Add `buildRenderableItems(messages)` function:**
   - Input: Array of NormalizedMessage
   - Output: Array of RenderableItem
   - Logic: Expand assistant messages with tool_use into sequences

2. **Modify `buildHtml` function:**
   - Replace direct iteration over `messages`
   - Iterate over `buildRenderableItems(messages)` instead
   - Generate appropriate HTML for each item type

3. **Update HTML generation:**
   - Add switch/if statements to handle three types:
     - `type: 'message'` → existing message HTML
     - `type: 'tool-call'` → new tool call HTML with indentation
     - `type: 'tool-result'` → new tool result HTML with indentation

4. **Remove chunk limit in right panel:**
   - Change `chunks.slice(0, 5)` to `chunks`
   - Update label from "showing first 5" to remove the limitation text

5. **CSS updates:**
   - Add styles for `.msg.tool-call`, `.msg.tool-result`, `.msg.indented`
   - Ensure indented blocks have clear visual hierarchy

**Testing Approach:**
- Sessions with multiple tool calls per assistant message
- Sessions with incomplete tool calls (no results)
- Sessions with mixed tool types (bash, read, write, edit, grep, etc.)
- Verify indentation renders correctly across browsers
- Test with very long tool outputs (bash results, large files)

## Implementation Notes

- Use existing `ToolUsePart` and `ToolResultPart` types from message.ts
- Maintain backward compatibility with existing session logs
- No changes to session logging format required
- All changes contained in `src/commands/log.ts`

## Success Criteria

1. Tool calls appear as indented blocks under assistant messages in left panel
2. Tool results appear as indented blocks immediately after their corresponding tool calls
3. Tool names, inputs, and results are clearly formatted and readable
4. Incomplete tool calls are visually distinct
5. All chunks are shown in right panel (no 5-chunk limit)
6. Visual hierarchy is clear through indentation
7. Works with all existing session logs
