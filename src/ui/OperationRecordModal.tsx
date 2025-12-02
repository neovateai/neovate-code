import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import PaginatedSelectInput from './PaginatedSelectInput';
import { useAppStore } from './store';

interface OperationRecordInfo {
  messageUuid: string;
  parentMessageUuid: string | null;
  timestamp: string;
  operationCount: number;
  affectedFiles: string[];
  messageRole?: 'user' | 'assistant';
  messageTimestamp?: string;
  userPrompt?: string;
}

interface OperationRecordModalProps {
  onClose: () => void;
}

export function OperationRecordModal({ onClose }: OperationRecordModalProps) {
  const { bridge, cwd, sessionId, log, isRestoringOperationRecord } =
    useAppStore();
  const [operationRecords, setOperationRecords] = useState<
    OperationRecordInfo[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only listen to ESC when there's no PaginatedSelectInput (which has its own ESC handler)
  // This fixes the issue where operationRecords.length === 0 or loading/error states can't be closed
  const hasSelectInput = !loading && !error && operationRecords.length > 0;

  useInput(
    (input, key) => {
      if (key.escape) {
        onClose();
      }
    },
    { isActive: !hasSelectInput },
  );

  useEffect(() => {
    bridge
      .request('session.listOperationRecords', { cwd, sessionId })
      .then((result) => {
        if (result.success && Array.isArray(result.data?.operationRecords)) {
          // Sort by timestamp descending (newest first)
          const sortedRecords = [...result.data.operationRecords].sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );
          setOperationRecords(sortedRecords);
        } else {
          setError(result.error?.message || 'Failed to load operation records');
          setOperationRecords([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch operation records:', err);
        setError(err.message || 'Unknown error');
        setOperationRecords([]);
        setLoading(false);
      });
  }, [cwd, sessionId, bridge]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'just now';
    }
  };

  const selectItems = [
    // Add operation records
    ...operationRecords.map((record) => {
      const fileList = record.affectedFiles.slice(0, 2).join(', ');
      const moreFiles =
        record.affectedFiles.length > 2
          ? ` +${record.affectedFiles.length - 2}`
          : '';

      // Truncate user prompt to 60 characters
      const promptPreview = record.userPrompt
        ? record.userPrompt.length > 60
          ? `${record.userPrompt.substring(0, 60)}...`
          : record.userPrompt
        : '';

      const label = [
        formatTime(record.timestamp).padEnd(10),
        `${record.operationCount} ops`.padEnd(8),
        `${fileList}${moreFiles}`.padEnd(30),
      ].join(' ');

      const fullLabel = promptPreview
        ? `${label}\n    💬 ${promptPreview}`
        : label;

      return {
        label: fullLabel,
        value: record.messageUuid,
      };
    }),
    // Add initial state option
    {
      label: `${'Initial'.padEnd(10)} ${'0 ops'.padEnd(8)} (Undo all AI changes)`,
      value: '__INITIAL_STATE__',
    },
  ];

  if (loading) {
    return (
      <Box
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text>Loading operation records...</Text>
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Press Esc to cancel
          </Text>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text color="red">Error: {error}</Text>
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Press Esc to close
          </Text>
        </Box>
      </Box>
    );
  }

  if (operationRecords.length === 0) {
    return (
      <Box
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text color="yellow">No operation records found in this session.</Text>
        <Box marginTop={1}>
          <Text color="gray">
            Operation records are created automatically when AI modifies files.
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Press Esc to close
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Box marginBottom={1}>
        <Text bold>Rollback to Operation</Text>
        <Text color="gray" dimColor>
          Select an operation to rollback to - undoes changes from that point
          onward and fills prompt for re-editing
        </Text>
      </Box>
      {isRestoringOperationRecord && (
        <Box marginBottom={1}>
          <Text color="yellow">
            ⏳ Restoring operation record, please wait...
          </Text>
        </Box>
      )}
      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          Rollback will: undo selected operation + all later changes, auto-fill
          prompt
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">
          {'  '}
          {['Time'.padEnd(10), 'Changes'.padEnd(8), 'Files'].join(' ')}
        </Text>
      </Box>
      <Box>
        <PaginatedSelectInput
          items={selectItems}
          initialIndex={0}
          itemsPerPage={10}
          onSelect={async (item) => {
            // Handle Initial State rollback
            if (item.value === '__INITIAL_STATE__') {
              // Find the first (oldest) operation record
              const firstRecord = operationRecords[operationRecords.length - 1];

              if (!firstRecord) {
                log('❌ No operation records to rollback');
                onClose();
                return;
              }

              // Rollback to the first operation record (which will undo it)
              const result = await bridge.request(
                'session.rollbackToOperation',
                {
                  cwd,
                  sessionId,
                  targetMessageUuid: firstRecord.messageUuid,
                },
              );

              if (result.success) {
                const data = result.data;

                // Clear input for initial state
                useAppStore.setState({ inputValue: '' });

                // Reload messages
                const messagesResponse = await bridge.request(
                  'session.messages.list',
                  { cwd, sessionId },
                );
                if (messagesResponse.success) {
                  useAppStore.setState({
                    messages: messagesResponse.data.messages,
                  });
                }

                useAppStore.getState().incrementRestoreCounter();

                const lines: string[] = [];
                lines.push(
                  '📍 Rolled back to Initial State (before all AI changes)',
                );

                if (data.restoredFiles.length > 0) {
                  lines.push(
                    `✅ ${data.restoredFiles.length} file(s) restored`,
                  );
                }

                if (lines.length > 0) {
                  log(lines.join('\n'));
                }

                onClose();
              } else {
                log(
                  `❌ Rollback failed: ${result.error?.message || 'Unknown error'}`,
                );
                onClose();
              }
              return;
            }

            // Handle normal operation record rollback
            const selectedRecord = operationRecords.find(
              (r) => r.messageUuid === item.value,
            );

            const result = await bridge.request('session.rollbackToOperation', {
              cwd,
              sessionId,
              targetMessageUuid: item.value,
            });

            if (result.success) {
              const data = result.data;

              // Auto-fill prompt to input box if available
              if (data.userPromptToFill) {
                useAppStore.setState({
                  inputValue: data.userPromptToFill,
                  inputCursorPosition: data.userPromptToFill.length,
                });
              } else {
                useAppStore.setState({
                  inputValue: '',
                  inputCursorPosition: 0,
                });
              }

              // Reload messages to show the restore hint message
              const messagesResponse = await bridge.request(
                'session.messages.list',
                { cwd, sessionId },
              );
              if (messagesResponse.success) {
                useAppStore.setState({
                  messages: messagesResponse.data.messages,
                });
              }

              // Increment restoreCounter to force Static component re-render
              useAppStore.getState().incrementRestoreCounter();

              // Also log a summary in the logs panel
              const lines: string[] = [];

              if (selectedRecord?.userPrompt) {
                lines.push(
                  `📍 Rolled back to BEFORE: "${selectedRecord.userPrompt}"`,
                );
                lines.push(
                  '💡 Prompt filled in input - edit and Enter to re-run, or Esc to skip',
                );
              }

              if (data.restoredFiles.length > 0) {
                lines.push(
                  `✅ ${data.restoredFiles.length} file(s): ${data.restoredFiles.slice(0, 3).join(', ')}${data.restoredFiles.length > 3 ? ` +${data.restoredFiles.length - 3}` : ''}`,
                );
              }

              if (data.skippedBashFiles.length > 0) {
                lines.push(
                  `⏭️  Skipped ${data.skippedBashFiles.length} bash file(s)`,
                );
              }

              if (lines.length > 0) {
                log(lines.join('\n'));
              }

              onClose();
            } else {
              log(
                `❌ Restore failed: ${result.error?.message || 'Unknown error'}`,
              );
              onClose();
            }
          }}
          onCancel={onClose}
        />
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          ↑↓: Navigate • Enter: Rollback to selected operation • Esc: Cancel
        </Text>
      </Box>
    </Box>
  );
}
