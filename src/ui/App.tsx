import { Box, Text } from 'ink';
import type { NormalizedMessage } from '../message';
import type { Message } from '../message';
import SelectInput from 'ink-select-input';
import React, { useCallback } from 'react';
import { ActivityIndicator } from './ActivityIndicator';
import { ApprovalModal } from './ApprovalModal';
import { BackgroundPrompt } from './BackgroundPrompt';
import { ChatInput } from './ChatInput';
import { Debug } from './Debug';
import { ExitHint } from './ExitHint';
import { ForkModal } from './ForkModal';
import { RestoreOptionsModal, type RestoreMode } from './RestoreOptionsModal';
import { Markdown } from './Markdown';
import { Messages } from './Messages';
import { QueueDisplay } from './QueueDisplay';
import { useAppStore } from './store';
import { useTerminalRefresh } from './useTerminalRefresh';

function SlashCommandJSX() {
  const { slashCommandJSX } = useAppStore();
  return <Box>{slashCommandJSX}</Box>;
}

function PlanResult() {
  const { planResult, approvePlan, denyPlan } = useAppStore();
  const onSelect = useCallback(
    (approved: boolean) => {
      if (approved) {
        approvePlan(planResult ?? '');
      } else {
        denyPlan();
      }
    },
    [planResult, approvePlan, denyPlan],
  );
  if (!planResult) return null;
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      padding={1}
    >
      <Text bold>Here is the plan:</Text>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        padding={1}
      >
        <Markdown>{planResult ?? ''}</Markdown>
      </Box>
      <Box marginY={1}>
        <Text bold>Do you want to proceed?</Text>
      </Box>
      <SelectInput
        items={[
          {
            label: 'Yes',
            value: true,
          },
          {
            label: 'No, I want to edit the plan',
            value: false,
          },
        ]}
        onSelect={(item: any) => onSelect(item.value)}
      />
    </Box>
  );
}

export function App() {
  const { forceRerender } = useTerminalRefresh();
  const {
    forkModalVisible,
    messages,
    fork,
    hideForkModal,
    forkParentUuid,
    forkCounter,
    bridge,
    sessionId,
    cwd,
  } = useAppStore();
  const [forkMessages, setForkMessages] = React.useState<NormalizedMessage[]>(
    [],
  );
  const [forkLoading, setForkLoading] = React.useState(false);
  const [snapshotCache, setSnapshotCache] = React.useState<
    Record<string, boolean>
  >({});
  const [showRestoreOptions, setShowRestoreOptions] = React.useState(false);
  const [selectedMessage, setSelectedMessage] = React.useState<{
    uuid: string;
    message: Message & NormalizedMessage;
  } | null>(null);

  const getMessagePreview = (message: Message): string => {
    let text = '';
    if (typeof message.content === 'string') {
      text = message.content;
    } else if (Array.isArray(message.content)) {
      const textParts = message.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text);
      text = textParts.join(' ');
    }
    return text.length > 80 ? text.slice(0, 80) + '...' : text;
  };

  const getTimestamp = (message: Message & NormalizedMessage): string => {
    if (!message.timestamp) return '';
    const date = new Date(message.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleForkSelect = (
    uuid: string,
    message: Message & NormalizedMessage,
  ) => {
    console.log(`[handleForkSelect] Selected user message UUID: ${uuid}`);
    console.log(`[handleForkSelect] snapshotCache:`, snapshotCache);
    console.log(
      `[handleForkSelect] hasSnapshot for this UUID: ${snapshotCache[uuid]}`,
    );
    setSelectedMessage({ uuid, message });
    setShowRestoreOptions(true);
  };

  const handleRestoreOptionSelect = async (mode: RestoreMode) => {
    if (mode === 'cancel' || !selectedMessage) {
      setShowRestoreOptions(false);
      setSelectedMessage(null);
      return;
    }

    const restoreCode = mode === 'both' || mode === 'code';
    const restoreConversation = mode === 'both' || mode === 'conversation';

    await fork(selectedMessage.uuid, { restoreCode, restoreConversation });
    setShowRestoreOptions(false);
    setSelectedMessage(null);
  };

  const handleRestoreOptionsClose = () => {
    setShowRestoreOptions(false);
    setSelectedMessage(null);
  };

  const getSnapshotFileCount = (uuid: string): number => {
    // This would need to be enhanced to actually track file counts
    // For now, we just indicate whether a snapshot exists
    return snapshotCache[uuid] ? 1 : 0;
  };

  React.useEffect(() => {
    if (!forkModalVisible) return;
    // Use messages from current state instead of loading from file
    // This ensures fork modal shows the truncated message list after a fork operation
    setForkMessages(messages as NormalizedMessage[]);

    if (!bridge || !cwd || !sessionId) {
      setSnapshotCache({});
      return;
    }

    setForkLoading(true);
    (async () => {
      try {
        const userMessages = (messages as NormalizedMessage[]).filter(
          (m) => m.role === 'user',
        );

        // Parallel query for all snapshots
        const snapshotPromises = userMessages.map(async (userMessage) => {
          const userUuid = userMessage.uuid;
          if (!userUuid) return { userUuid: '', hasSnapshot: false };

          const assistantMessage = (messages as NormalizedMessage[]).find(
            (m) => m.parentUuid === userUuid && m.role === 'assistant',
          );

          const targetUuid = assistantMessage ? assistantMessage.uuid : null;

          if (targetUuid) {
            const snapshotRes = await bridge.request('session.getSnapshot', {
              cwd,
              sessionId,
              messageUuid: targetUuid,
            });
            return {
              userUuid,
              hasSnapshot:
                snapshotRes.success && snapshotRes.data?.snapshot !== null,
            };
          }
          return { userUuid, hasSnapshot: false };
        });

        const snapshotResults = await Promise.all(snapshotPromises);
        const newSnapshotCache: Record<string, boolean> = {};
        for (const { userUuid, hasSnapshot } of snapshotResults) {
          if (userUuid) {
            newSnapshotCache[userUuid] = hasSnapshot;
            console.log(
              `[SnapshotCache] User ${userUuid}: hasSnapshot = ${hasSnapshot}`,
            );
          }
        }

        console.log('[SnapshotCache] Final cache:', newSnapshotCache);
        setSnapshotCache(newSnapshotCache);
      } catch (_e) {
        setSnapshotCache({});
      } finally {
        setForkLoading(false);
      }
    })();
  }, [forkModalVisible, messages, bridge, cwd, sessionId]);

  return (
    <Box
      flexDirection="column"
      key={`${forceRerender}-${forkParentUuid}-${forkCounter}`}
    >
      <Messages />
      <BackgroundPrompt />
      <PlanResult />
      <ActivityIndicator />
      <QueueDisplay />
      <ChatInput />
      <SlashCommandJSX />
      <ApprovalModal />
      {forkModalVisible && !showRestoreOptions && (
        <ForkModal
          messages={forkMessages as any}
          onSelect={handleForkSelect}
          onClose={() => {
            hideForkModal();
          }}
          hasSnapshot={(uuid) => snapshotCache[uuid] ?? false}
          snapshotCache={snapshotCache}
        />
      )}
      {showRestoreOptions && selectedMessage && (
        <RestoreOptionsModal
          messagePreview={getMessagePreview(selectedMessage.message)}
          timestamp={getTimestamp(selectedMessage.message)}
          hasSnapshot={snapshotCache[selectedMessage.uuid] ?? false}
          fileCount={getSnapshotFileCount(selectedMessage.uuid)}
          onSelect={handleRestoreOptionSelect}
          onClose={handleRestoreOptionsClose}
        />
      )}
      <ExitHint />
      <Debug />
    </Box>
  );
}
