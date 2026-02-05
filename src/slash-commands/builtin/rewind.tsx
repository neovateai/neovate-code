import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { SnapshotPreview, RewindResult } from '../../snapshot/types';
import PaginatedSelectInput from '../../ui/PaginatedSelectInput';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

interface RewindSelectProps {
  onExit: () => void;
  onSelect: (result: RewindResult) => void;
}

const RewindSelect: React.FC<RewindSelectProps> = ({ onExit, onSelect }) => {
  const { bridge, cwd, sessionId, messages } = useAppStore();
  const [snapshots, setSnapshots] = useState<SnapshotPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rewinding, setRewinding] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError('No active session');
      setLoading(false);
      return;
    }

    bridge
      .request('snapshot.list', { cwd, sessionId })
      .then((result) => {
        if (result.success && Array.isArray(result.data?.snapshots)) {
          setSnapshots(result.data.snapshots);
        } else {
          setSnapshots([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(`Failed to fetch snapshots: ${err.message}`);
        setLoading(false);
      });
  }, [cwd, sessionId]);

  useInput((_: string, key) => {
    if (key.escape && !rewinding) {
      onExit();
    }
  });

  const formatTime = (timestamp: Date | string) => {
    const date =
      typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  };

  // Find message preview for each snapshot
  const getMessagePreview = (messageId: string): string => {
    // Find the user message that preceded this assistant message
    const msgIndex = messages.findIndex((m) => (m as any).uuid === messageId);
    if (msgIndex <= 0) return 'Unknown message';

    // Look backwards for the previous user message
    for (let i = msgIndex - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user') {
        let text = '';
        if (typeof msg.content === 'string') {
          text = msg.content;
        } else if (Array.isArray(msg.content)) {
          text = msg.content
            .filter((p) => p.type === 'text')
            .map((p) => (p as any).text)
            .join(' ');
        }
        // Truncate and clean
        text = text.replace(/\s+/g, ' ').trim();
        return text.length > 50 ? text.slice(0, 50) + '...' : text;
      }
    }
    return 'Unknown message';
  };

  const selectItems = snapshots.map((snapshot, index) => {
    const preview = getMessagePreview(snapshot.messageId);
    const time = formatTime(snapshot.timestamp);
    const files = snapshot.fileCount;
    const changes = snapshot.changes
      ? `+${snapshot.changes.insertions}/-${snapshot.changes.deletions}`
      : '';

    return {
      label: [
        time.padEnd(10),
        `${files} file${files !== 1 ? 's' : ''}`.padEnd(12),
        changes.padEnd(12),
        preview,
      ].join(' '),
      value: snapshot.messageId,
    };
  });

  if (loading) {
    return (
      <Box
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text>Loading checkpoints...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        borderStyle="round"
        borderColor="red"
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (snapshots.length === 0) {
    return (
      <Box
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text color="yellow">No checkpoints found in this session.</Text>
        <Text dimColor>
          Checkpoints are created after AI responses that modify files.
        </Text>
      </Box>
    );
  }

  if (rewinding) {
    return (
      <Box
        borderStyle="round"
        borderColor="cyan"
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text color="cyan">Restoring files to checkpoint...</Text>
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
        <Text bold color="cyan">
          Rewind to Checkpoint
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">
          {'  '}
          {[
            'Time'.padEnd(10),
            'Files'.padEnd(12),
            'Changes'.padEnd(12),
            'Message',
          ].join(' ')}
        </Text>
      </Box>
      <Box>
        <PaginatedSelectInput
          items={selectItems}
          initialIndex={0}
          itemsPerPage={10}
          onSelect={async (item) => {
            setRewinding(true);
            try {
              const result = await bridge.request('snapshot.rewind', {
                cwd,
                sessionId: sessionId!,
                messageId: item.value,
                dryRun: false,
              });

              if (result.success && result.data?.result) {
                onSelect(result.data.result);
              } else if (!result.success) {
                setError('Failed to rewind: ' + result.error);
                setRewinding(false);
              } else {
                setError('Failed to rewind: Unknown error');
                setRewinding(false);
              }
            } catch (err: any) {
              setError('Failed to rewind: ' + err.message);
              setRewinding(false);
            }
          }}
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Esc to cancel</Text>
      </Box>
    </Box>
  );
};

export function createRewindCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'rewind',
    description: 'Restore files to a previous checkpoint',
    async call(onDone) {
      const RewindComponent = () => {
        return (
          <RewindSelect
            onExit={() => {
              onDone('Rewind cancelled');
            }}
            onSelect={(result) => {
              if (result.success) {
                const summary = [
                  `Restored ${result.filesChanged.length} file(s)`,
                  result.insertions > 0 ? `+${result.insertions}` : '',
                  result.deletions > 0 ? `-${result.deletions}` : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                onDone(summary);
              } else {
                onDone(`Rewind failed: ${result.error}`);
              }
            }}
          />
        );
      };
      return <RewindComponent />;
    },
  };
}
