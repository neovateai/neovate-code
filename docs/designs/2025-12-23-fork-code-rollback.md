# Fork Code Rollback Feature

## Overview

Enhance the existing ESC-ESC fork functionality to support both chat history rollback AND code changes rollback, similar to Claude Code. The system will create snapshots after write/edit tool executions and restore file states when forking to a previous message.

## Requirements

### User Scenario
- Typical usage involves adding/modifying code
- Most changes affect fewer than 20 files
- Total changes are within 2000 lines
- Project is an existing git repository
- User wants to avoid git conflicts with fork operations

### Key Constraints
- Snapshot creation: Only after `write` and `edit` tools (not bash commands)
- Storage: In session config (deleted when session is deleted)
- Approach: Per-message snapshot (not checkpoint-based or diff-based)

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Fork Flow                               │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────┐     ESC-ESC      ┌─────────────────────┐
│   User presses ESC  │────────────────▶│    ForkModal        │
│       twice         │                  │  (Enhanced)         │
└─────────────────────┘                  └─────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│   User selects message with snapshot indicator (*)          │
└─────────────────────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────┐   fork() action   ┌─────────────────────┐
│  Store.fork()      │──────────────────▶│  SnapshotManager   │
│  (Enhanced)        │                 │  .restoreSnapshot()  │
└─────────────────────┘                  └─────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│   Files restored to snapshot state + Chat truncated         │
└─────────────────────────────────────────────────────────────┘
```

### Data Structures

```typescript
interface FileSnapshot {
  path: string;
  content: string;
  hash: string;
}

interface MessageSnapshot {
  messageUuid: string;
  timestamp: string;
  files: FileSnapshot[];
}

interface SessionSnapshots {
  snapshots: MessageSnapshot[];
}

// Extended SessionConfig
interface SessionConfig {
  // ... existing fields
  snapshots?: SessionSnapshots;
}
```

## Implementation Plan

### 1. Snapshot Manager (`src/utils/snapshot.ts`)

```typescript
import { createHash } from 'crypto';
import zlib from 'zlib';
import { readFile, writeFile } from 'fs/promises';
import type { NormalizedMessage } from '../message';

export class SnapshotManager {
  private snapshots: Map<string, MessageSnapshot> = new Map();
  private messageSnapshotMap: Map<string, string> = new Map();

  async createSnapshot(
    filePaths: string[],
    messageUuid: string,
  ): Promise<MessageSnapshot> {
    const files: FileSnapshot[] = [];

    for (const filePath of filePaths) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const hash = createHash('md5').update(content).digest('hex');
        files.push({ path: filePath, content, hash });
      } catch (error) {
        console.error(`Failed to snapshot ${filePath}:`, error);
      }
    }

    const snapshot: MessageSnapshot = {
      messageUuid,
      timestamp: new Date().toISOString(),
      files,
    };

    this.snapshots.set(messageUuid, snapshot);
    this.messageSnapshotMap.set(messageUuid, messageUuid);

    return snapshot;
  }

  async restoreSnapshot(messageUuid: string): Promise<void> {
    const snapshot = this.snapshots.get(messageUuid);
    if (!snapshot) {
      return;
    }

    for (const file of snapshot.files) {
      try {
        await writeFile(file.path, file.content, 'utf-8');
      } catch (error) {
        console.error(`Failed to restore ${file.path}:`, error);
      }
    }
  }

  hasSnapshot(messageUuid: string): boolean {
    return this.snapshots.has(messageUuid);
  }

  getSnapshot(messageUuid: string): MessageSnapshot | undefined {
    return this.snapshots.get(messageUuid);
  }

  serialize(): string {
    const data = Array.from(this.snapshots.values());
    return zlib.gzipSync(JSON.stringify(data)).toString('base64');
  }

  static deserialize(data: string): SnapshotManager {
    const manager = new SnapshotManager();
    try {
      const decompressed = zlib.gunzipSync(Buffer.from(data, 'base64'));
      const snapshots: MessageSnapshot[] = JSON.parse(decompressed.toString());
      for (const snapshot of snapshots) {
        manager.snapshots.set(snapshot.messageUuid, snapshot);
        manager.messageSnapshotMap.set(snapshot.messageUuid, snapshot.messageUuid);
      }
    } catch (error) {
      console.error('Failed to deserialize snapshots:', error);
    }
    return manager;
  }
}
```

### 2. Enhance Write Tool (`src/tools/write.ts`)

Add snapshot creation after successful write operation:

```typescript
// After successful write execution
const result = await writeFile(file_path, content);

if (result.success) {
  // Create snapshot for the written file
  await createToolSnapshot([file_path], sessionManager);
}
```

### 3. Enhance Edit Tool (`src/tools/edit.ts`)

Add snapshot creation after successful edit operation:

```typescript
// After successful edit execution
const result = await applyEdit(...);

if (result.success) {
  // Create snapshot for the edited file
  await createToolSnapshot([file_path], sessionManager);
}
```

### 4. Helper Function for Tool Snapshots (`src/utils/snapshot.ts`)

```typescript
export async function createToolSnapshot(
  filePaths: string[],
  sessionManager: SessionManager,
): Promise<void> {
  const snapshotManager = sessionManager.getSnapshotManager();
  const latestMessage = sessionManager.getLatestMessage();

  if (!latestMessage || !latestMessage.uuid) {
    return;
  }

  const snapshot = await snapshotManager.createSnapshot(
    filePaths,
    latestMessage.uuid,
  );

  // Save to session config
  await sessionManager.saveSnapshots();
}
```

### 5. Enhance ForkModal (`src/ui/ForkModal.tsx`)

Add visual indicator for messages with snapshots:

```typescript
// In the message rendering
{userMessages.map((message, index) => {
  const isSelected = index === selectedIndex;
  const preview = getMessagePreview(message);
  const timestamp = getTimestamp(message);
  const hasSnapshot = snapshotManager?.hasSnapshot(message.uuid);

  return (
    <Box key={message.uuid} marginBottom={0}>
      <Text
        color={isSelected ? 'cyan' : 'white'}
        bold={isSelected}
        backgroundColor={isSelected ? 'blue' : undefined}
      >
        {isSelected ? '> ' : '  '}
        {timestamp} | {preview}
        {hasSnapshot && <Text color="green"> 📁</Text>}
      </Text>
    </Box>
  );
})}
```

### 6. Enhance Store fork Action (`src/ui/store.ts`)

Add snapshot restoration to the fork action:

```typescript
fork: async (targetMessageUuid: string) => {
  const { bridge, cwd, sessionId, messages } = get();

  // Restore snapshot if available
  const snapshotData = await bridge.request('session.getSnapshot', {
    cwd,
    sessionId,
    messageUuid: targetMessageUuid,
  });

  if (snapshotData.success && snapshotData.data) {
    await bridge.request('session.restoreSnapshot', {
      cwd,
      sessionId,
      messageUuid: targetMessageUuid,
    });
  }

  // Existing fork logic for chat history
  const targetMessage = messages.find(
    (m) => (m as NormalizedMessage).uuid === targetMessageUuid,
  );
  if (!targetMessage) {
    get().log(`Fork error: Message ${targetMessageUuid} not found`);
    return;
  }

  const messageIndex = messages.findIndex(
    (m) => (m as NormalizedMessage).uuid === targetMessageUuid,
  );
  const filteredMessages = messages.slice(0, messageIndex);

  let contentText = '';
  if (typeof targetMessage.content === 'string') {
    contentText = targetMessage.content;
  } else if (Array.isArray(targetMessage.content)) {
    const textParts = targetMessage.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text);
    contentText = textParts.join('');
  }

  set({
    messages: filteredMessages,
    forkParentUuid: (targetMessage as NormalizedMessage).parentUuid,
    inputValue: contentText,
    inputCursorPosition: contentText.length,
    forkModalVisible: false,
  });
  get().incrementForkCounter();
},
```

### 7. Session Manager Enhancements (`src/session.ts`)

Add snapshot management to SessionManager:

```typescript
class SessionManager {
  private snapshotManager: SnapshotManager | null = null;

  getSnapshotManager(): SnapshotManager {
    if (!this.snapshotManager) {
      this.snapshotManager = new SnapshotManager();
      const config = this.loadConfig();
      if (config.snapshots) {
        this.snapshotManager = SnapshotManager.deserialize(
          config.snapshots.serialized,
        );
      }
    }
    return this.snapshotManager;
  }

  async saveSnapshots(): Promise<void> {
    if (this.snapshotManager) {
      const serialized = this.snapshotManager.serialize();
      const config = this.loadConfig();
      config.snapshots = { serialized };
      await this.saveConfig(config);
    }
  }
}
```

### 8. NodeBridge Handlers (`src/nodeBridge.ts`)

Add handlers for snapshot operations:

```typescript
case 'session.getSnapshot': {
  const { messageUuid } = payload;
  const session = getSessionManager(cwd, sessionId);
  const snapshotManager = session.getSnapshotManager();
  const snapshot = snapshotManager.getSnapshot(messageUuid);
  return {
    success: true,
    data: { snapshot },
  };
}

case 'session.restoreSnapshot': {
  const { messageUuid } = payload;
  const session = getSessionManager(cwd, sessionId);
  const snapshotManager = session.getSnapshotManager();
  await snapshotManager.restoreSnapshot(messageUuid);
  return {
    success: true,
  };
}
```

## Error Handling

### Snapshot Creation Failures
- Log errors but don't fail the tool execution
- Skip files that can't be read
- Continue with other files in the batch

### Snapshot Restoration Failures
- Log errors for files that can't be restored
- Continue with other files in the snapshot
- Show summary to user in logs

### Corrupted Snapshot Data
- Gracefully handle deserialization errors
- Clear corrupted snapshots from config
- Log error and continue without snapshots

## Testing

### Unit Tests
- Test `SnapshotManager.createSnapshot()` with various file types
- Test `SnapshotManager.restoreSnapshot()` restoration
- Test serialization/deserialization round-trip
- Test handling of missing/unreadable files

### Integration Tests
- Test write tool creates snapshot
- Test edit tool creates snapshot
- Test fork restores files correctly
- Test multiple snapshots per session
- Test fork without snapshot (graceful degradation)

### E2E Tests
- Test complete workflow: write → fork → restore
- Test multiple file modifications
- Test fork to different checkpoints
- Test session persistence (snapshots survive restart)

## Performance Considerations

### Storage Efficiency
- Compression (gzip) reduces 2000 lines to ~10-20KB
- Only snapshot files actually modified
- Hash-based deduplication could be added later

### Restoration Speed
- Direct file writes (no git operations)
- Batch writes for better performance
- Async operations don't block UI

### Memory Usage
- Snapshots stored compressed in memory
- Lazy loading for large snapshot sets
- Cleanup of old snapshots (optional feature)

## Future Enhancements

1. **Snapshot Diff Viewer**: Show what files changed between checkpoints
2. **Selective Restore**: Allow choosing which files to restore
3. **Snapshot History Command**: `/snapshots` to view all snapshots
4. **Manual Snapshot**: `/snapshot` command to create manual checkpoint
5. **Snapshot Compression Optimization**: Use diff-based storage for large files
6. **Conflict Resolution**: Better handling when files changed externally

## Migration Notes

- Existing sessions without snapshots will continue to work
- Snapshots stored in session config, no database migration needed
- Fork functionality is backward compatible (snapshots optional)

## References

- Current fork implementation: `src/ui/ForkModal.tsx`
- Current fork logic: `src/ui/store.ts` (fork action)
- Write tool: `src/tools/write.ts`
- Edit tool: `src/tools/edit.ts`
- Session management: `src/session.ts`
