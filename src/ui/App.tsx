import { Box, Text } from 'ink';
import type { NormalizedMessage } from '../message';
import SelectInput from 'ink-select-input';
import React, { useCallback } from 'react';
import { ActivityIndicator } from './ActivityIndicator';
import { ApprovalModal } from './ApprovalModal';
import { BackgroundPrompt } from './BackgroundPrompt';
import { ChatInput } from './ChatInput';
import { Debug } from './Debug';
import { ExitHint } from './ExitHint';
import { ForkModal } from './ForkModal';
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

  const hasSnapshot = React.useCallback(
    (uuid: string) => {
      if (!bridge || !cwd || !sessionId) return false;
      return snapshotCache[uuid] ?? false;
    },
    [bridge, cwd, sessionId, snapshotCache],
  );

  React.useEffect(() => {
    if (!forkModalVisible) return;
    if (!bridge || !cwd || !sessionId) {
      setForkMessages([]);
      setSnapshotCache({});
      return;
    }
    setForkLoading(true);
    (async () => {
      try {
        const res = await bridge.request('session.messages.list', {
          cwd,
          sessionId,
        });
        const messages = res.data?.messages || [];
        setForkMessages(messages);

        const userMessages = messages.filter(
          (m) => (m as NormalizedMessage).role === 'user',
        );

        const newSnapshotCache: Record<string, boolean> = {};

        for (const userMessage of userMessages) {
          const userUuid = (userMessage as NormalizedMessage).uuid;
          if (!userUuid) continue;

          const assistantMessage = messages.find(
            (m) =>
              (m as NormalizedMessage).parentUuid === userUuid &&
              (m as NormalizedMessage).role === 'assistant',
          );

          const targetUuid = assistantMessage
            ? (assistantMessage as NormalizedMessage).uuid
            : null;

          if (targetUuid) {
            const snapshotRes = await bridge.request('session.getSnapshot', {
              cwd,
              sessionId,
              messageUuid: targetUuid,
            });
            newSnapshotCache[userUuid] =
              snapshotRes.success && snapshotRes.data?.snapshot !== null;
          } else {
            newSnapshotCache[userUuid] = false;
          }
        }

        setSnapshotCache(newSnapshotCache);
      } catch (_e) {
        setForkMessages([]);
        setSnapshotCache({});
      } finally {
        setForkLoading(false);
      }
    })();
  }, [forkModalVisible, bridge, cwd, sessionId]);
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
      {forkModalVisible && (
        <ForkModal
          messages={forkMessages as any}
          onSelect={(uuid) => {
            fork(uuid);
          }}
          onClose={() => {
            hideForkModal();
          }}
          hasSnapshot={hasSnapshot}
          snapshotCache={snapshotCache}
        />
      )}
      <ExitHint />
      <Debug />
    </Box>
  );
}
