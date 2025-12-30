import { Box, Text } from 'ink';
import React, { useMemo, useCallback } from 'react';
import { UI_COLORS } from './constants';
import { SelectInput, type SelectOption } from './SelectInput';

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
  // Build SelectInput options from restore modes
  const selectOptions = useMemo<SelectOption[]>(() => {
    const allOptions = [
      {
        type: 'text' as const,
        value: 'both',
        label: 'Restore code and conversation',
        description: 'Fork conversation and restore snapshot',
        available: hasSnapshot,
      },
      {
        type: 'text' as const,
        value: 'conversation',
        label: 'Restore conversation',
        description: 'Fork conversation only, keep current code',
        available: true,
      },
      {
        type: 'text' as const,
        value: 'code',
        label: 'Restore code',
        description: 'Restore snapshot only, keep conversation',
        available: hasSnapshot,
      },
      {
        type: 'text' as const,
        value: 'cancel',
        label: 'Never mind',
        description: 'Cancel and return',
        available: true,
      },
    ];

    return allOptions.filter((opt) => opt.available);
  }, [hasSnapshot]);

  const handleChange = useCallback(
    (value: string | string[]) => {
      if (typeof value === 'string') {
        onSelect(value as RestoreMode);
      }
    },
    [onSelect],
  );

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

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

      <SelectInput
        options={selectOptions}
        mode="single"
        onChange={handleChange}
        onCancel={handleCancel}
      />

      <Box marginTop={1}>
        <Text dimColor>
          ⚠ Rewinding does not affect files edited manually or via bash.
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor color={UI_COLORS.ASK_SECONDARY}>
          Use ↑/↓ to navigate, Enter to select, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
}
