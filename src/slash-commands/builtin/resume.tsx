import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import PaginatedSelectInput from '../../ui/PaginatedSelectInput';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

interface SessionInfo {
  sessionId: string;
  modified: Date;
  created: Date;
  messageCount: number;
  gitBranch?: string;
  summary?: string;
}

interface ResumeSelectProps {
  onExit: () => void;
  onSelect: (sessionId: string) => void;
}

const ResumeSelect: React.FC<ResumeSelectProps> = ({ onExit, onSelect }) => {
  const { bridge, cwd, resumeSession } = useAppStore();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bridge
      .request('getAllSessions', { cwd })
      .then((result) => {
        if (result.success && Array.isArray(result.data?.sessions)) {
          setSessions(result.data.sessions);
        } else {
          console.error('Invalid sessions data:', result);
          setSessions([]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch sessions:', error);
        setSessions([]);
        setLoading(false);
      });
  }, [cwd]);

  useInput((_: string, key) => {
    if (key.escape) {
      onExit();
    }
  });

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  };

  const selectItems = sessions.map((session) => ({
    label: [
      formatTime(session.modified).padEnd(12),
      formatTime(session.created).padEnd(12),
      session.messageCount.toString().padEnd(8),
      session.summary || 'No summary',
    ].join(' '),
    value: session.sessionId,
  }));

  if (loading) {
    return (
      <Box
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text>Loading sessions...</Text>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Box
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text color="yellow">No sessions found.</Text>
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
        <Text bold>Resume Session</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">
          {'  '}
          {[
            'Modified'.padEnd(12),
            'Created'.padEnd(12),
            'Messages'.padEnd(8),
            'Summary',
          ].join(' ')}
        </Text>
      </Box>
      <Box>
        <PaginatedSelectInput
          items={selectItems}
          initialIndex={0}
          itemsPerPage={10}
          onSelect={async (item) => {
            const result = await bridge.request('resumeSession', {
              cwd,
              sessionId: item.value,
            });
            if (result.success) {
              const { sessionId, logFile } = result.data;
              await resumeSession(sessionId, logFile);
              onSelect(item.value);
            }
          }}
        />
      </Box>
    </Box>
  );
};

export function createResumeCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'resume',
    description: 'Resume from a specific session',
    async call(onDone) {
      const ResumeComponent = () => {
        return (
          <ResumeSelect
            onExit={() => {
              onDone('Session resume cancelled');
            }}
            onSelect={(sessionId) => {
              onDone(`Session resumed to ${sessionId}`);
            }}
          />
        );
      };
      return <ResumeComponent />;
    },
  };
}
