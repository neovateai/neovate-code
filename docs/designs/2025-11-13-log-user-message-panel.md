# Log Viewer: User Message Side Panel

**Date:** 2025-11-13

## Context

The log command (`/log`) generates an HTML viewer for session logs with a two-panel layout. Currently, only assistant messages are clickable and show details in the right panel (Message JSON, Request ID, Model, Tools, Request, Response, Error, Chunks). User messages are not interactive.

The goal is to make user messages clickable as well, but display only the "Message JSON" section in the side panel, without the LLM request/response details that are specific to assistant messages.

## Discussion

Three approaches were considered:

1. **Conditional Rendering (Simplest):** Make user messages clickable and modify the existing `renderDetails()` function to show minimal content when no `requestId` is present.
2. **Separate Render Functions:** Create distinct functions for rendering user vs assistant details.
3. **Template with Type Flag:** Pass a message type parameter and use template conditionals.

**Decision:** Approach 1 was selected for its simplicity and minimal code changes. It reuses the existing `renderDetails()` function with a conditional check based on whether a `requestId` exists.

## Approach

### What Changes
1. **CSS:** Add `cursor: pointer` to `.msg.user` to indicate clickability
2. **Click Handler:** Remove the restriction that only allows clicking assistant messages
3. **renderDetails() Logic:** When `requestId` is `null`, render only the "Message JSON" section; otherwise render full details

### Why This Works
- User messages don't have associated request logs, so `requestId` will be `null`
- Assistant messages already have `requestId`, so they continue to show full details
- Single function handles both cases with minimal branching

## Architecture

### CSS Update
```css
.msg.user { 
  background: #fafafa; 
  cursor: pointer;  /* NEW */
}
```

### Click Handler Changes
**Before:**
```javascript
if (!el.classList.contains('assistant')) return;
```

**After:**
```javascript
// Remove the restriction - allow both user and assistant messages
```

Both message types extract `msgId` from `data-msg-uuid`. Assistant messages also have `data-request-id`, while user messages will have `requestId = null`.

### renderDetails() Function
Add conditional template rendering:

```javascript
function renderDetails(requestId) {
  const d = requestId ? requestData[requestId] : null;
  
  if (!requestId) {
    // Minimal template for user messages
    const html = `
      <div class="details">
        <div><b>Message JSON:</b></div>
        <pre><code>__MESSAGE__</code></pre>
      </div>
    `;
    const finalHtml = html.replace('__MESSAGE__', pretty(state.lastMessage || null));
    right.innerHTML = finalHtml;
    return;
  }
  
  // Full template for assistant messages (existing logic)
  // ...
}
```

### Edge Cases
1. **User message without msgId:** `state.lastMessage` will be `null`, `pretty(null)` handles it gracefully
2. **Initial state:** Placeholder text remains: "Select an assistant message to see request details" (could be updated to "Select a message to see details")
3. **State management:** Reuses existing `state.lastMessage` for both message types

### Testing
1. Run `/log` command
2. Click user message → verify only "Message JSON" appears
3. Click assistant message → verify full details appear
4. Switch between message types → verify panel updates correctly
5. Hover over user messages → verify cursor changes to pointer

### No Breaking Changes
- Assistant messages work exactly as before
- Only additive: user messages become interactive
- Existing session logs remain compatible
