import { Box, Text, useInput } from 'ink';
import React from 'react';
import { UI_COLORS } from './constants';

export type RestoreMode = 'both' | 'conversation' | 'code' | 'cancel';

interface RestoreOptionsModalProps {
  messagePreview: string;
  timestamp: string;
  hasSnapshot: boolean;
  fileCount?: number;
  onSelect: (mode: RestoreMode) => void;
  onClose: () => void;
}

export function RestoreOptionsModal({
  messagePreview,
  timestamp,
  hasSnapshot,
  fileCount = 0,
  onSelect,
  onClose,
}: RestoreOptionsModalProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const options = [
    {
      value: 'both' as RestoreMode,
      label: 'Restore code and conversation',
      description: 'Fork conversation and restore snapshot',
      available: hasSnapshot,
    },
    {
      value: 'conversation' as RestoreMode,
      label: 'Restore conversation',
      description: 'Fork conversation only, keep current code',
      available: true,
    },
    {
      value: 'code' as RestoreMode,
      label: 'Restore code',
      description: 'Restore snapshot only, keep conversation',
      available: hasSnapshot,
    },
    {
      value: 'cancel' as RestoreMode,
      label: 'Never mind',
      description: 'Cancel and return',
      available: true,
    },
  ];

  const availableOptions = options.filter((opt) => opt.available);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) =>
        Math.min(availableOptions.length - 1, prev + 1),
      );
    } else if (key.return) {
      if (availableOptions[selectedIndex]) {
        onSelect(availableOptions[selectedIndex].value);
      }
    } else {
      // Number key shortcuts (1-4)
      const num = parseInt(input, 10);
      if (num >= 1 && num <= availableOptions.length) {
        onSelect(availableOptions[num - 1].value);
      }
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      padding={1}
      width="100%"
    >
      <Box marginBottom={1}>
        <Text bold color="yellow">
          Rewind
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text>
          Confirm you want to restore to the point before you sent this message:
        </Text>
        <Box marginLeft={2} marginTop={1}>
          <Text bold color="cyan">
            │ {messagePreview}
          </Text>
        </Box>
        <Box marginLeft={2}>
          <Text dimColor>│ ({timestamp})</Text>
        </Box>
      </Box>

      {hasSnapshot && (
        <Box marginBottom={1}>
          <Text>The conversation will be forked.</Text>
          <Text> The code will be restored </Text>
          <Text color="green">
            {fileCount > 0
              ? `in ${fileCount} file${fileCount > 1 ? 's' : ''}`
              : ''}
          </Text>
          <Text>.</Text>
        </Box>
      )}

      {!hasSnapshot && (
        <Box marginBottom={1}>
          <Text color="yellow">⚠ No snapshot available for this message.</Text>
        </Box>
      )}

      <Box flexDirection="column">
        {availableOptions.map((option, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={option.value} marginBottom={0}>
              <Text
                color={isSelected ? 'cyan' : undefined}
                bold={isSelected}
                inverse={isSelected}
              >
                {isSelected ? '❯ ' : '  '}
                {index + 1}. {option.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          ⚠ Rewinding does not affect files edited manually or via bash.
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Use ↑/↓ to navigate, Enter to select, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
}
