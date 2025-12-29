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

    for (const file of snapshot.files) {
      // Always update with earlier snapshot (we're going backwards in time)
      fileRestorationPlan.set(file.path, {
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
 * Truncate history to match the forked messages
 */
export function truncateHistory(
  filteredMessages: Message[],
  currentHistory: string[],
): string[] {
  const userMessagesBeforeTarget = filteredMessages.filter(
    (m) => (m as NormalizedMessage).role === 'user',
  ).length;

  return currentHistory.slice(0, userMessagesBeforeTarget);
}
