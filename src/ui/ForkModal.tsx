import { Box, Text, useInput } from 'ink';
import React from 'react';
import { CANCELED_MESSAGE_TEXT } from '../constants';
import type { Message } from '../message';
import { isCanceledMessage } from '../message';
import { isSlashCommand } from '../slashCommand';
import type { RewindResult } from '../snapshot/types';
import { UI_COLORS } from './constants';
import { SelectInput, type SelectOption } from './SelectInput';
import type { UIBridge } from '../uiBridge';
import { findLastAssistantAfterUser } from '../utils/messageQuery';
import { useTerminalSize } from './useTerminalSize';

interface ForkModalProps {
  messages: (Message & {
    uuid: string;
    parentUuid: string | null;
    timestamp: string;
  })[];
  onSelect: (uuid: string, restoreCode?: boolean) => void;
  onClose: () => void;
  sessionId: string;
  cwd: string;
  bridge: UIBridge;
}

const getMessageText = (message: Message): string => {
  if (typeof message.content === 'string') {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ');
  }
  return '';
};

const hasBashStdout = (text: string): boolean => {
  return text.includes('<bash-stdout>');
};

const extractBashInput = (text: string): string | null => {
  const match = text.match(/<bash-input>([\s\S]*?)<\/bash-input>/);
  return match ? match[1] : null;
};

type ModalView = 'message-list' | 'confirm-rewind';

export function ForkModal({
  messages,
  onSelect,
  onClose,
  sessionId,
  cwd,
  bridge,
}: ForkModalProps) {
  const userMessages = React.useMemo(
    () =>
      messages.filter((m) => {
        if (m.role !== 'user') return false;
        if ('hidden' in m && m.hidden) return false;
        if (isCanceledMessage(m)) return false;
        const text = getMessageText(m);
        if (text === CANCELED_MESSAGE_TEXT) return false;
        if (isSlashCommand(text)) return false;
        if (hasBashStdout(text)) return false;
        return true;
      }),
    [messages],
  );

  const [selectedIndex, setSelectedIndex] = React.useState(
    () => userMessages.length,
  );
  const [view, setView] = React.useState<ModalView>('message-list');
  const [selectedMessage, setSelectedMessage] = React.useState<
    (Message & { uuid: string; timestamp: string }) | null
  >(null);
  const [rewindPreview, setRewindPreview] = React.useState<RewindResult | null>(
    null,
  );
  const [messageSnapshots, setMessageSnapshots] = React.useState<
    Map<string, { own: RewindResult | null; cumulative: RewindResult | null }>
  >(new Map());
  const { columns } = useTerminalSize();

  // Preload snapshots for all messages
  React.useEffect(() => {
    const loadSnapshots = async () => {
      const newSnapshots = new Map<
        string,
        { own: RewindResult | null; cumulative: RewindResult | null }
      >();

      const userMessageIndex = new Map<string, number>();
      messages.forEach((m, idx) => {
        if (m.role === 'user') {
          userMessageIndex.set(m.uuid, idx);
        }
      });

      const assistantsWithSnapshots: { uuid: string; index: number }[] = [];
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (m.role === 'assistant') {
          try {
            const hasResult = await bridge.request('snapshot.has', {
              cwd,
              sessionId,
              messageId: m.uuid,
            });
            if (hasResult.success && hasResult.data?.hasSnapshot) {
              assistantsWithSnapshots.push({ uuid: m.uuid, index: i });
            }
          } catch {}
        }
      }

      for (const message of userMessages) {
        const msgIndex = userMessageIndex.get(message.uuid) ?? -1;

        const ownAssistantUuid = findLastAssistantAfterUser(
          messages,
          message.uuid,
        );
        let ownSnapshot: RewindResult | null = null;

        if (ownAssistantUuid) {
          const hasOwn = assistantsWithSnapshots.find(
            (a) => a.uuid === ownAssistantUuid,
          );
          if (hasOwn) {
            try {
              const ownResult = await bridge.request('snapshot.previewRewind', {
                cwd,
                sessionId,
                messageId: ownAssistantUuid,
                cumulative: false,
              });
              ownSnapshot = ownResult.success ? ownResult.data.result : null;
            } catch {}
          }
        }

        const firstSnapshotAfter = assistantsWithSnapshots.find(
          (a) => a.index > msgIndex,
        );

        let cumulativeSnapshot: RewindResult | null = null;

        if (firstSnapshotAfter) {
          try {
            const previewResult = await bridge.request(
              'snapshot.previewRewind',
              {
                cwd,
                sessionId,
                messageId: firstSnapshotAfter.uuid,
                cumulative: true,
              },
            );

            cumulativeSnapshot = previewResult.success
              ? previewResult.data.result
              : null;
          } catch {}
        }

        newSnapshots.set(message.uuid, {
          own: ownSnapshot,
          cumulative: cumulativeSnapshot,
        });
      }

      setMessageSnapshots(newSnapshots);
    };

    loadSnapshots();
  }, [userMessages, messages, bridge, cwd, sessionId]);

  useInput((input, key) => {
    if (key.escape) {
      if (view === 'confirm-rewind') {
        setView('message-list');
        setSelectedMessage(null);
        setRewindPreview(null);
      } else {
        onClose();
      }
    } else if (key.upArrow) {
      if (view === 'message-list') {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      }
    } else if (key.downArrow) {
      if (view === 'message-list') {
        setSelectedIndex((prev) => Math.min(userMessages.length, prev + 1));
      }
    } else if (key.return) {
      if (view === 'message-list') {
        if (selectedIndex === userMessages.length) {
          onClose();
        } else if (userMessages[selectedIndex]) {
          const message = userMessages[selectedIndex];
          const uuid = message.uuid;
          const snapshotData = messageSnapshots.get(uuid);

          setSelectedMessage(message);
          setRewindPreview(
            snapshotData?.cumulative ?? {
              success: true,
              filesChanged: [],
              insertions: 0,
              deletions: 0,
            },
          );
          setView('confirm-rewind');
        }
      }
    }
  });

  const getMessagePreview = (
    message: Message,
  ): { text: string; isBashInput: boolean } => {
    let text = getMessageText(message);
    const bashInput = extractBashInput(text);
    if (bashInput !== null) {
      text = bashInput.replace(/\s+/g, ' ').trim();
      return { text, isBashInput: true };
    }
    text = text.replace(/\s+/g, ' ').trim();
    return { text, isBashInput: false };
  };

  const getRelativeTime = (timestamp: string): string => {
    if (!timestamp) return '';
    const now = Date.now();
    const date = new Date(timestamp);
    const diffMs = now - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (view === 'confirm-rewind' && selectedMessage && rewindPreview) {
    return (
      <ConfirmRewindView
        message={selectedMessage}
        rewindPreview={rewindPreview}
        onConfirm={(restoreMode) => {
          if (restoreMode === 'cancel') {
            setView('message-list');
            setSelectedMessage(null);
            setRewindPreview(null);
          } else {
            const restoreCode =
              restoreMode === 'both' || restoreMode === 'code';
            onSelect(selectedMessage.uuid, restoreCode);
          }
        }}
        onBack={() => {
          setView('message-list');
          setSelectedMessage(null);
          setRewindPreview(null);
        }}
        getMessagePreview={getMessagePreview}
        getRelativeTime={getRelativeTime}
      />
    );
  }

  // Render message list
  return (
    <Box flexDirection="column">
      <Box>
        <Text color={UI_COLORS.ASK_PRIMARY} bold>
          {'─'.repeat(Math.max(0, columns))}
        </Text>
      </Box>

      <Box marginBottom={1} marginTop={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>
          Rewind
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Restore the code and/or conversation to the point before…</Text>
      </Box>

      <Box flexDirection="column">
        {userMessages.length === 0 ? (
          <Box marginBottom={1}>
            <Text dimColor>No previous messages to jump to</Text>
          </Box>
        ) : (
          <>
            {userMessages.map((message, index) => {
              const isSelected = index === selectedIndex;
              const { text: preview } = getMessagePreview(message);
              const snapshotData = messageSnapshots.get(message.uuid);
              const snapshot = snapshotData?.own;

              return (
                <Box key={message.uuid} flexDirection="column" marginBottom={1}>
                  <Box>
                    <Text color={isSelected ? UI_COLORS.ASK_PRIMARY : 'white'}>
                      {isSelected ? '❯ ' : '  '}
                    </Text>
                    <Text color={isSelected ? UI_COLORS.ASK_PRIMARY : 'white'}>
                      {preview}
                    </Text>
                  </Box>

                  {snapshot &&
                  snapshot.filesChanged.length > 0 &&
                  (snapshot.insertions > 0 || snapshot.deletions > 0) ? (
                    <Box paddingLeft={2}>
                      <Text dimColor>{snapshot.filesChanged.join(', ')}</Text>
                      <Text color="green"> +{snapshot.insertions}</Text>
                      <Text color="red"> -{snapshot.deletions}</Text>
                    </Box>
                  ) : (
                    <Box paddingLeft={2}>
                      <Text dimColor>No code changes</Text>
                    </Box>
                  )}
                </Box>
              );
            })}
            <Box>
              <Text
                color={
                  selectedIndex === userMessages.length
                    ? UI_COLORS.ASK_PRIMARY
                    : 'white'
                }
              >
                {selectedIndex === userMessages.length ? '❯ ' : '  '}
              </Text>
              <Text
                color={
                  selectedIndex === userMessages.length
                    ? UI_COLORS.ASK_PRIMARY
                    : 'white'
                }
                dimColor={selectedIndex !== userMessages.length}
                italic
              >
                (current)
              </Text>
            </Box>
          </>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Enter to continue · Esc to exit</Text>
      </Box>
    </Box>
  );
}

interface ConfirmRewindViewProps {
  message: Message & { uuid: string; timestamp: string };
  rewindPreview: RewindResult;
  onConfirm: (restoreMode: 'both' | 'conversation' | 'code' | 'cancel') => void;
  onBack: () => void;
  getMessagePreview: (message: Message) => {
    text: string;
    isBashInput: boolean;
  };
  getRelativeTime: (timestamp: string) => string;
}

function ConfirmRewindView({
  message,
  rewindPreview,
  onConfirm,
  onBack,
  getMessagePreview,
  getRelativeTime,
}: ConfirmRewindViewProps) {
  const { text: messagePreview } = getMessagePreview(message);
  const relativeTime = getRelativeTime(message.timestamp);
  const { columns } = useTerminalSize();

  const hasCodeChanges =
    rewindPreview.filesChanged.length > 0 &&
    (rewindPreview.insertions > 0 || rewindPreview.deletions > 0);

  const selectOptions: SelectOption[] = React.useMemo(
    () =>
      hasCodeChanges
        ? [
            {
              type: 'text',
              value: 'both',
              label: 'Restore code and conversation',
            },
            {
              type: 'text',
              value: 'conversation',
              label: 'Restore conversation',
            },
            { type: 'text', value: 'code', label: 'Restore code' },
            { type: 'text', value: 'cancel', label: 'Never mind' },
          ]
        : [
            {
              type: 'text',
              value: 'conversation',
              label: 'Restore conversation',
            },
            { type: 'text', value: 'cancel', label: 'Never mind' },
          ],
    [hasCodeChanges],
  );

  const [focusedValue, setFocusedValue] = React.useState<string>(
    selectOptions[0].value,
  );

  React.useEffect(() => {
    setFocusedValue(selectOptions[0].value);
  }, [selectOptions]);

  const handleChange = (value: string | string[]) => {
    if (typeof value === 'string') {
      onConfirm(value as 'both' | 'conversation' | 'code' | 'cancel');
    }
  };

  const willRestoreConversation =
    focusedValue === 'both' || focusedValue === 'conversation';
  const willRestoreCode = focusedValue === 'both' || focusedValue === 'code';

  const fileChangeSummary = React.useMemo(() => {
    if (!willRestoreCode) {
      return <Text dimColor>The code will be unchanged.</Text>;
    }

    const { filesChanged, insertions, deletions } = rewindPreview;

    if (filesChanged.length === 0) {
      return <Text dimColor>The code will be unchanged.</Text>;
    }

    if (filesChanged.length === 1) {
      return (
        <Box>
          <Text dimColor>The code will be restored </Text>
          <Text color="green">+{insertions}</Text>
          <Text dimColor> </Text>
          <Text color="red">-{deletions}</Text>
          <Text dimColor> in {filesChanged[0]}.</Text>
        </Box>
      );
    }

    return (
      <Box>
        <Text dimColor>The code will be restored </Text>
        <Text color="green">+{insertions}</Text>
        <Text dimColor> </Text>
        <Text color="red">-{deletions}</Text>
        <Text dimColor> in {filesChanged.length} files.</Text>
      </Box>
    );
  }, [rewindPreview, willRestoreCode]);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={UI_COLORS.ASK_PRIMARY} bold>
          {'─'.repeat(Math.max(0, columns))}
        </Text>
      </Box>

      <Box marginTop={1} marginBottom={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>
          Rewind
        </Text>
      </Box>

      <Box>
        <Text>
          Confirm you want to restore to the point before you sent this message:
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        <Box>
          <Text dimColor>│ </Text>
          <Text>{messagePreview}</Text>
        </Box>
        {relativeTime && (
          <Box>
            <Text dimColor>│ ({relativeTime})</Text>
          </Box>
        )}
      </Box>

      <Box>
        <Text dimColor>
          {willRestoreConversation
            ? 'The conversation will be forked.'
            : 'The conversation will be unchanged.'}
        </Text>
      </Box>
      <Box marginBottom={1}>{fileChangeSummary}</Box>

      <SelectInput
        options={selectOptions}
        mode="single"
        onChange={handleChange}
        onFocus={setFocusedValue}
        onCancel={onBack}
      />

      {hasCodeChanges && (
        <Box marginTop={1}>
          <Text dimColor>
            ⚠ Rewinding does not affect files edited manually or via bash.
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Enter to continue · Esc to exit</Text>
      </Box>
    </Box>
  );
}
