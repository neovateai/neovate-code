import type { Message, NormalizedMessage } from '../../message';
import type { UIBridge } from '../../uiBridge';

interface SnapshotInfo {
  messageUuid: string;
  snapshot: any;
  isTarget: boolean;
}

interface FileRestorationPlan {
  messageUuid: string;
  isFromTarget: boolean;
}

export interface RestoreConversationState {
  messages: Message[];
  forkParentUuid: string | null;
  inputValue: string;
  inputCursorPosition: number;
  forkModalVisible: boolean;
  history: string[];
}

/**
 * Find the assistant message that is a response to the target user message
 */
export function findTargetAssistantMessage(
  messages: Message[],
  targetUserUuid: string,
): NormalizedMessage | undefined {
  return messages.find(
    (m) =>
      (m as NormalizedMessage).parentUuid === targetUserUuid &&
      (m as NormalizedMessage).role === 'assistant',
  ) as NormalizedMessage | undefined;
}

/**
 * Collect snapshots from target message and all messages after it
 */
export async function collectSnapshots(
  bridge: UIBridge,
  cwd: string,
  sessionId: string,
  messages: Message[],
  targetIndex: number,
  targetAssistantMessage: NormalizedMessage | undefined,
): Promise<SnapshotInfo[]> {
  const snapshotsToProcess: SnapshotInfo[] = [];

  // Get target snapshot
  if (targetAssistantMessage) {
    const targetSnapshotUuid = targetAssistantMessage.uuid;
    const targetSnapshotResponse = await bridge.request('session.getSnapshot', {
      cwd,
      sessionId,
      messageUuid: targetSnapshotUuid,
    });

    if (
      targetSnapshotResponse.success &&
      targetSnapshotResponse.data?.snapshot
    ) {
      snapshotsToProcess.push({
        messageUuid: targetSnapshotUuid,
        snapshot: targetSnapshotResponse.data.snapshot,
        isTarget: true,
      });
    }
  }

  // Get all snapshots after target in parallel
  const messagesAfterTarget = messages.slice(targetIndex + 1);
  const assistantMessagesAfterTarget = messagesAfterTarget.filter(
    (m) =>
      (m as NormalizedMessage).role === 'assistant' &&
      (m as NormalizedMessage).uuid,
  );

  // Parallel query for better performance
  const snapshotPromises = assistantMessagesAfterTarget.map(async (msg) => {
    const messageUuid = (msg as NormalizedMessage).uuid!;
    const snapshotResponse = await bridge.request('session.getSnapshot', {
      cwd,
      sessionId,
      messageUuid,
    });

    if (snapshotResponse.success && snapshotResponse.data?.snapshot) {
      return {
        messageUuid,
        snapshot: snapshotResponse.data.snapshot,
        isTarget: false,
      };
    }
    return null;
  });

  const results = await Promise.all(snapshotPromises);
  snapshotsToProcess.push(
    ...results.filter((r): r is SnapshotInfo => r !== null),
  );

  return snapshotsToProcess;
}

/**
 * Build file restoration plan by processing snapshots in REVERSE order
 *
 * Strategy: Restore files to their state at the target point
 * - If file appears in target snapshot: use target (file state before target modification)
 * - If file appears only in later snapshots: use the FIRST (earliest) later snapshot
 */
export function buildFileRestorationPlan(
  snapshotsToProcess: SnapshotInfo[],
): Map<string, FileRestorationPlan> {
  const fileRestorationPlan = new Map<string, FileRestorationPlan>();

  // Process snapshots in reverse (from latest to target)
  for (let i = snapshotsToProcess.length - 1; i >= 0; i--) {
    const { messageUuid, snapshot, isTarget } = snapshotsToProcess[i];

    // snapshot.trackedFileBackups is a Record<string, FileBackup>
    for (const filePath of Object.keys(snapshot.trackedFileBackups)) {
      // Always update with earlier snapshot (we're going backwards in time)
      fileRestorationPlan.set(filePath, {
        messageUuid,
        isFromTarget: isTarget,
      });
    }
  }

  return fileRestorationPlan;
}

/**
 * Group files by their source snapshot for efficient restoration
 */
export function groupFilesBySnapshot(
  fileRestorationPlan: Map<string, FileRestorationPlan>,
): Map<string, string[]> {
  const restoreGroups = new Map<string, string[]>();

  for (const [filePath, { messageUuid }] of fileRestorationPlan.entries()) {
    if (!restoreGroups.has(messageUuid)) {
      restoreGroups.set(messageUuid, []);
    }
    restoreGroups.get(messageUuid)!.push(filePath);
  }

  return restoreGroups;
}

/**
 * Execute file restoration from snapshots
 */
export async function restoreFilesFromSnapshots(
  bridge: UIBridge,
  cwd: string,
  sessionId: string,
  restoreGroups: Map<string, string[]>,
  logFn: (message: string) => void,
): Promise<number> {
  let totalFilesRestored = 0;

  for (const [messageUuid, filePaths] of restoreGroups.entries()) {
    logFn(
      `Fork: Restoring ${filePaths.length} file(s) from snapshot ${messageUuid}`,
    );

    const restoreResponse = await bridge.request(
      'session.restoreSnapshotFiles',
      {
        cwd,
        sessionId,
        messageUuid,
        filePaths,
      },
    );

    if (!restoreResponse.success) {
      logFn(
        `Fork: Failed to restore files from snapshot ${messageUuid}: ${restoreResponse.error || 'Unknown error'}`,
      );
    } else if (restoreResponse.data) {
      totalFilesRestored += restoreResponse.data.restoredCount;
    }
  }

  return totalFilesRestored;
}

/**
 * Extract text content from a message
 */
export function extractMessageText(message: Message): string {
  if (typeof message.content === 'string') {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    const textParts = message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text);
    return textParts.join('');
  }
  return '';
}

/**
 * Restore code to the target point by collecting and restoring snapshots
 */
export async function restoreCodeToTargetPoint(
  bridge: UIBridge,
  cwd: string,
  sessionId: string,
  messages: Message[],
  targetIndex: number,
  targetMessageUuid: string,
  logFn: (message: string) => void,
  deleteSnapshotsAfterRestore: boolean = false,
): Promise<void> {
  const targetAssistantMessage = findTargetAssistantMessage(
    messages,
    targetMessageUuid,
  );

  const snapshotsToProcess = await collectSnapshots(
    bridge,
    cwd,
    sessionId,
    messages,
    targetIndex,
    targetAssistantMessage,
  );

  if (snapshotsToProcess.length === 0) {
    logFn('Fork: No snapshots found, skipping code restoration');
    return;
  }

  const fileRestorationPlan = buildFileRestorationPlan(snapshotsToProcess);
  const restoreGroups = groupFilesBySnapshot(fileRestorationPlan);

  const totalFilesRestored = await restoreFilesFromSnapshots(
    bridge,
    cwd,
    sessionId,
    restoreGroups,
    logFn,
  );

  if (totalFilesRestored > 0) {
    logFn(`Fork: Successfully restored ${totalFilesRestored} file(s)`);
  } else {
    logFn('Fork: No files to restore (no snapshots found)');
  }

  if (deleteSnapshotsAfterRestore) {
    logFn('Fork: Cleaning up snapshots after code restoration');
    for (const snapshotInfo of snapshotsToProcess) {
      await bridge.request('session.deleteSnapshot', {
        cwd,
        sessionId,
        messageUuid: snapshotInfo.messageUuid,
      });
    }
    logFn(
      `Fork: Deleted ${snapshotsToProcess.length} snapshot(s) after restoration`,
    );
  }
}

/**
 * Build restore conversation state object
 */
export function buildRestoreConversationState(
  messages: Message[],
  targetIndex: number,
  targetMessage: Message,
  currentHistory: string[],
): RestoreConversationState {
  const filteredMessages = messages.slice(0, targetIndex);
  const contentText = extractMessageText(targetMessage);

  return {
    messages: filteredMessages,
    forkParentUuid: (targetMessage as NormalizedMessage).parentUuid,
    inputValue: contentText,
    inputCursorPosition: contentText.length,
    forkModalVisible: false,
    history: currentHistory,
  };
}
