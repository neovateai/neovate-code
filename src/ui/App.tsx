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
import { getMessagePreview, getRelativeTimestamp } from './utils/messageUtils';

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
  const [snapshotFileCounts, setSnapshotFileCounts] = React.useState<
    Record<string, number>
  >({});
  const [showRestoreOptions, setShowRestoreOptions] = React.useState(false);
  const [selectedMessage, setSelectedMessage] = React.useState<{
    uuid: string;
    message: Message & NormalizedMessage;
  } | null>(null);

  const handleForkSelect = (
    uuid: string,
    message: Message & NormalizedMessage,
  ) => {
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
    return snapshotFileCounts[uuid] || 0;
  };

  React.useEffect(() => {
    if (!forkModalVisible) return;
    // Use messages from current state instead of loading from file
    setForkMessages(messages as NormalizedMessage[]);

    if (!bridge || !cwd || !sessionId) {
      setSnapshotCache({});
      return;
    }

    setForkLoading(true);
    (async () => {
      try {
        // Use the new snapshot summary API for better performance
        const summaryRes = await bridge.request('session.getSnapshotSummary', {
          cwd,
          sessionId,
        });

        if (summaryRes.success && summaryRes.data?.snapshotSummary) {
          const snapshotSummary = summaryRes.data.snapshotSummary as Record<
            string,
            { fileCount: number }
          >;
          const newSnapshotCache: Record<string, boolean> = {};
          const newSnapshotFileCounts: Record<string, number> = {};

          // Map assistant message UUIDs to user message UUIDs
          for (const m of messages as NormalizedMessage[]) {
            if (m.role === 'user' && m.uuid) {
              // Find the assistant message that responds to this user message
              const assistantMessage = (messages as NormalizedMessage[]).find(
                (am) => am.parentUuid === m.uuid && am.role === 'assistant',
              );
              if (assistantMessage?.uuid) {
                const snapshotInfo = snapshotSummary[assistantMessage.uuid];
                if (snapshotInfo) {
                  newSnapshotCache[m.uuid] = true;
                  newSnapshotFileCounts[m.uuid] = snapshotInfo.fileCount;
                }
              }
            }
          }

          setSnapshotCache(newSnapshotCache);
          setSnapshotFileCounts(newSnapshotFileCounts);
        } else {
          setSnapshotCache({});
          setSnapshotFileCounts({});
        }
      } catch (_e) {
        setSnapshotCache({});
        setSnapshotFileCounts({});
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
          timestamp={getRelativeTimestamp(selectedMessage.message)}
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
