import { Box, Text, useInput } from 'ink';
import React from 'react';
import type { Message } from '../message';
import { isCanceledMessage } from '../message';
import { CANCELED_MESSAGE_TEXT } from '../constants';

interface ForkModalProps {
  messages: (Message & {
    uuid: string;
    parentUuid: string | null;
    timestamp: string;
  })[];
  onSelect: (uuid: string) => void;
  onClose: () => void;
}

export function ForkModal({ messages, onSelect, onClose }: ForkModalProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Filter to user messages only and reverse for chronological order (newest first)
  const userMessages = messages
    .filter(
      (m) =>
        m.role === 'user' &&
        !('hidden' in m && m.hidden) &&
        !isCanceledMessage(m) &&
        !(typeof m.content === 'string' && m.content === CANCELED_MESSAGE_TEXT),
    )
    .reverse();

  useInput((input, key) => {
    if (key.escape) {
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(userMessages.length - 1, prev + 1));
    } else if (key.return) {
      if (userMessages[selectedIndex]) {
        onSelect(userMessages[selectedIndex].uuid!);
      }
    }
  });

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

  const getTimestamp = (message: Message & { timestamp: string }): string => {
    if (!message.timestamp) return '';
    const date = new Date(message.timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
      width="100%"
    >
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Jump to Previous Message
        </Text>
      </Box>
      <Box flexDirection="column">
        {userMessages.map((message, index) => {
          const isSelected = index === selectedIndex;
          const preview = getMessagePreview(message);
          const timestamp = getTimestamp(message);

          return (
            <Box key={message.uuid} marginBottom={0}>
              <Text
                color={isSelected ? 'cyan' : 'white'}
                bold={isSelected}
                backgroundColor={isSelected ? 'blue' : undefined}
              >
                {isSelected ? '> ' : '  '}
                {timestamp} | {preview}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Use ↑/↓ to navigate, Enter to select, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
}
