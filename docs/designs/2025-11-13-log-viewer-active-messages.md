# Log Viewer: Active Messages & UUID Display

**Date:** 2025-11-13

## Context

The log viewer currently displays all messages from a session's history without distinguishing which messages are part of the active chain versus inactive branches (forks). This makes it difficult to understand which messages are actually relevant to the current session state. Additionally, there's no easy way to reference specific messages by their UUID for debugging purposes.

The goal is to enhance the log viewer to:
1. Visually distinguish active messages from inactive ones (messages not in the current active chain)
2. Display message UUIDs in a shortened format for easier debugging and reference

## Discussion

### Key Decisions

**Visual Treatment for Inactive Messages:**
- Considered three options: grayed out but visible, completely hidden, or strikethrough styling
- **Decision:** Grayed out but fully visible with reduced opacity
- **Rationale:** The log viewer's purpose is to show complete session history for debugging, so hiding messages would defeat the purpose

**UUID Display Format:**
- Considered full UUID, shortened (first 8 chars), hover-only, or always visible
- **Decision:** Show first 8 characters, always visible in small subtle font
- **Rationale:** Balances readability with functionality; 8 chars matches the session ID format used elsewhere

**Implementation Strategy:**
- Explored backend-computed active set vs. pure frontend computation
- **Decision:** Backend-computed (Approach A)
- **Rationale:** 
  - Reuses existing `filterMessages` logic from `session.ts`
  - Clean data flow with computation at generation time
  - Better performance, especially for large sessions
  - No code duplication

## Approach

Import `filterMessages` from `session.ts` to compute the active message chain during HTML generation. The active UUIDs will be passed to the HTML builder, which applies a `disabled` CSS class to inactive messages and adds a UUID badge to all messages.

This approach maintains the log viewer's purpose of showing complete history while clearly indicating which messages are part of the active chain.

## Architecture

### Data Flow

1. **Load messages**: `loadAllSessionMessages()` loads all messages from the JSONL file
2. **Compute active set**: Call `filterMessages(messages)` to get the active message chain
3. **Extract active UUIDs**: Create a `Set<string>` of UUIDs from filtered messages for O(1) lookup
4. **Pass to HTML builder**: Add `activeUuids: Set<string>` parameter to `buildHtml()`
5. **Apply during rendering**: Check if each message UUID is in the active set:
   - Active: render normally
   - Inactive: add `disabled` CSS class
6. **Display UUID**: Add UUID badge showing first 8 characters in top-right corner

**Key principle:** Active/inactive determination happens once at generation time, not in the browser.

### HTML Structure

Each message div will include:
```html
<div class="msg user disabled" data-msg-uuid="abc123">
  <div class="uuid-badge">abc123de</div>
  <div class="meta">user · timestamp</div>
  <div class="content">message text</div>
</div>
```

### CSS Styling

**UUID Badge:**
- Position: absolute top-right
- Font: 10-11px monospace
- Color: subtle (#999) with semi-transparent white background
- Padding: 2px 6px with border-radius for readability

**Disabled Messages:**
- Opacity: 0.4-0.5
- Maintains existing background colors (muted)
- Keeps cursor: pointer for clickability
- Tool-call and tool-result items inherit disabled state from parent assistant message

### Implementation Details

**File:** `src/commands/log.ts`

1. **Add import:**
   ```typescript
   import { filterMessages } from '../session';
   ```

2. **In `generateHtmlForSession()`:**
   ```typescript
   const messages = loadAllSessionMessages(sessionLogPath);
   const activeMessages = filterMessages(messages);
   const activeUuids = new Set(activeMessages.map(m => m.uuid));
   
   const html = buildHtml({
     sessionId,
     sessionLogPath,
     messages,
     requestLogs,
     activeUuids,
   });
   ```

3. **Update `buildHtml()` signature:**
   - Add `activeUuids: Set<string>` parameter

4. **In message rendering:**
   - Check `!activeUuids.has(m.uuid)` to add `disabled` class
   - Add UUID badge: `<div class="uuid-badge">${m.uuid.slice(0, 8)}</div>`
   - Propagate disabled state to child tool-call/tool-result items

5. **CSS additions:**
   ```css
   .msg { position: relative; }
   .uuid-badge {
     position: absolute;
     top: 8px;
     right: 10px;
     font-size: 10px;
     font-family: ui-monospace, monospace;
     color: #999;
     background: rgba(255, 255, 255, 0.8);
     padding: 2px 6px;
     border-radius: 3px;
   }
   .msg.disabled { opacity: 0.4; }
   .msg.disabled.tool-call,
   .msg.disabled.tool-result { opacity: 0.4; }
   ```

### Testing Considerations

- Sessions with multiple forks (inactive branches)
- Sessions with only linear history (all active)
- UUID badge doesn't overlap with message content
- Disabled messages remain clickable for details panel
- Tool-call/tool-result styling follows parent message state
