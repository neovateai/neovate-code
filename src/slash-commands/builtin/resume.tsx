import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Divider } from '../../ui/Divider';
import { UI_COLORS } from '../../ui/constants';
import TextInput from '../../ui/TextInput/index.js';
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

type FocusMode = 'search' | 'list' | 'rename';

interface ResumeSelectProps {
  onExit: () => void;
  onSelect: (sessionId: string) => void;
}

const ResumeSelect: React.FC<ResumeSelectProps> = ({ onExit, onSelect }) => {
  const { bridge, cwd, resumeSession } = useAppStore();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [focusMode, setFocusMode] = useState<FocusMode>('search');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pageOffset, setPageOffset] = useState(0);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const ITEMS_PER_PAGE = 10;

  const fetchSessions = useCallback(() => {
    bridge
      .request('sessions.list', { cwd })
      .then((result) => {
        if (result.success && Array.isArray(result.data?.sessions)) {
          setSessions(result.data.sessions);
        } else {
          setSessions([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setSessions([]);
        setLoading(false);
      });
  }, [cwd]);

  useEffect(() => {
    fetchSessions();
  }, [cwd]);

  const filteredSessions = sessions.filter((s) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      (s.summary || '').toLowerCase().includes(q) ||
      (s.gitBranch || '').toLowerCase().includes(q) ||
      s.sessionId.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
    setPageOffset(0);
  }, [filterText]);

  const visibleSessions = filteredSessions.slice(
    pageOffset,
    pageOffset + ITEMS_PER_PAGE,
  );
  const localIndex = selectedIndex - pageOffset;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const handleSearchSubmit = useCallback(() => {
    if (filteredSessions.length > 0) {
      setFocusMode('list');
    }
  }, [filteredSessions.length]);

  const handleSearchEscape = useCallback(() => {
    onExit();
  }, [onExit]);

  const handleRenameSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && renameSessionId) {
        bridge
          .request('sessions.rename', {
            cwd,
            sessionId: renameSessionId,
            title: trimmed,
          })
          .then((result) => {
            if (result.success) {
              fetchSessions();
            }
          })
          .catch(() => {});
      }
      setRenameSessionId(null);
      setRenameText('');
      setFocusMode('list');
    },
    [bridge, cwd, renameSessionId, fetchSessions],
  );

  const handleRenameEscape = useCallback(() => {
    setRenameSessionId(null);
    setRenameText('');
    setFocusMode('list');
  }, []);

  useInput((input, key) => {
    if (focusMode === 'search' || focusMode === 'rename') {
      return;
    }

    if (key.escape) {
      if (confirmDelete !== null) {
        setConfirmDelete(null);
        return;
      }
      onExit();
      return;
    }

    if (confirmDelete !== null) {
      if (input === 'y' || input === 'Y' || key.return) {
        const sessionIdToDelete = confirmDelete;
        setConfirmDelete(null);
        bridge
          .request('sessions.remove', { cwd, sessionId: sessionIdToDelete })
          .then((result) => {
            if (result.success) {
              setSessions((prev) =>
                prev.filter((s) => s.sessionId !== sessionIdToDelete),
              );
              if (selectedIndex >= filteredSessions.length - 1) {
                const newIndex = Math.max(0, filteredSessions.length - 2);
                setSelectedIndex(newIndex);
                setPageOffset(
                  Math.floor(newIndex / ITEMS_PER_PAGE) * ITEMS_PER_PAGE,
                );
              }
            }
          })
          .catch(() => {});
      } else if (input === 'n' || input === 'N') {
        setConfirmDelete(null);
      }
      return;
    }

    if (focusMode === 'list') {
      if (input === '/') {
        setFocusMode('search');
        return;
      }

      if (key.ctrl && input === 'r') {
        const session = filteredSessions[selectedIndex];
        if (session) {
          setRenameSessionId(session.sessionId);
          setRenameText(session.summary || '');
          setFocusMode('rename');
        }
        return;
      }

      if (key.return) {
        const session = filteredSessions[selectedIndex];
        if (!session) return;
        bridge
          .request('sessions.resume', { cwd, sessionId: session.sessionId })
          .then(async (result) => {
            if (result.success) {
              const { sessionId, logFile } = result.data;
              await resumeSession(sessionId, logFile);
              onSelect(session.sessionId);
            }
          })
          .catch(() => {});
        return;
      }

      if (input === 'd' || input === 'D') {
        const session = filteredSessions[selectedIndex];
        if (session) {
          setConfirmDelete(session.sessionId);
        }
        return;
      }

      if (key.upArrow) {
        if (selectedIndex > 0) {
          const newIndex = selectedIndex - 1;
          setSelectedIndex(newIndex);
          if (newIndex < pageOffset) {
            setPageOffset(Math.max(0, pageOffset - ITEMS_PER_PAGE));
          }
        } else {
          setFocusMode('search');
        }
        return;
      }

      if (key.downArrow) {
        if (selectedIndex < filteredSessions.length - 1) {
          const newIndex = selectedIndex + 1;
          setSelectedIndex(newIndex);
          if (newIndex >= pageOffset + ITEMS_PER_PAGE) {
            setPageOffset(pageOffset + ITEMS_PER_PAGE);
          }
        }
        return;
      }
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column">
        <Divider />
        <Box marginTop={1}>
          <Text color="gray">Loading sessions...</Text>
        </Box>
      </Box>
    );
  }

  const confirmSession = confirmDelete
    ? sessions.find((s) => s.sessionId === confirmDelete)
    : null;

  const summaryLabel = confirmSession?.summary || confirmDelete || '';

  return (
    <Box flexDirection="column">
      <Divider />
      <Box marginTop={1} marginBottom={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>
          Resume Session
        </Text>
      </Box>

      <Box
        borderStyle="round"
        borderColor={focusMode === 'search' ? UI_COLORS.ASK_PRIMARY : 'gray'}
        paddingLeft={1}
        paddingRight={1}
        marginBottom={1}
      >
        <Text color={focusMode === 'search' ? UI_COLORS.ASK_PRIMARY : 'gray'}>
          {'⌕ '}
        </Text>
        <TextInput
          focus={focusMode === 'search'}
          multiline={false}
          value={filterText}
          placeholder="Search…"
          onChange={setFilterText}
          onSubmit={handleSearchSubmit}
          onEscape={handleSearchEscape}
          onHistoryDown={handleSearchSubmit}
          disableCursorMovementForUpDownKeys={true}
          onReverseSearch={() => {}}
        />
      </Box>

      {filteredSessions.length === 0 ? (
        <Box marginBottom={1}>
          <Text color="yellow">No sessions found.</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {visibleSessions.map((session, idx) => {
            const isSelected = idx === localIndex && focusMode !== 'search';
            const isRenaming =
              focusMode === 'rename' && session.sessionId === renameSessionId;
            const summary = session.summary || 'No summary';
            const time = formatTime(session.modified);
            const branch = session.gitBranch;
            const meta = [time, branch].filter(Boolean).join(' · ');

            return (
              <Box
                key={session.sessionId}
                flexDirection="column"
                marginTop={idx > 0 ? 1 : 0}
              >
                <Box>
                  <Text
                    bold={isSelected}
                    color={isSelected ? UI_COLORS.ASK_PRIMARY : 'white'}
                  >
                    {isSelected ? '❯ ' : '  '}
                  </Text>
                  {isRenaming ? (
                    <Box>
                      <Text color="yellow">{'✎ Renaming: '}</Text>
                      <TextInput
                        focus={true}
                        multiline={false}
                        value={renameText}
                        onChange={setRenameText}
                        onSubmit={handleRenameSubmit}
                        onEscape={handleRenameEscape}
                        onReverseSearch={() => {}}
                      />
                    </Box>
                  ) : (
                    <Text
                      bold={isSelected}
                      color={isSelected ? UI_COLORS.ASK_PRIMARY : 'white'}
                    >
                      {summary}
                    </Text>
                  )}
                </Box>
                <Box>
                  <Text dimColor>
                    {'  '}
                    {meta}
                  </Text>
                </Box>
              </Box>
            );
          })}
          {filteredSessions.length > ITEMS_PER_PAGE && (
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                {`  ${pageOffset + 1}-${Math.min(pageOffset + ITEMS_PER_PAGE, filteredSessions.length)} / ${filteredSessions.length}`}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {confirmDelete !== null && (
        <Box marginTop={1}>
          <Text color="red">{`Delete "${summaryLabel.slice(0, 40)}"? `}</Text>
          <Text color="white">[y/N]</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          {focusMode === 'rename'
            ? 'Enter to confirm · Esc to cancel'
            : focusMode === 'search'
              ? 'Type to search · ↓ to navigate · Esc to cancel'
              : '↑↓ to navigate · / to search · d to delete · Ctrl+R to rename · Enter to select · Esc to cancel'}
        </Text>
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
