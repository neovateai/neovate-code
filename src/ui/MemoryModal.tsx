import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import React, { useMemo } from 'react';
import { UI_COLORS } from './constants';
import { useAppStore } from './store';

export function MemoryModal() {
  const { memoryModal } = useAppStore();
  if (!memoryModal) {
    return null;
  }
  return <MemoryModalContent />;
}

function MemoryModalContent() {
  const { memoryModal, productName } = useAppStore();

  const selectOptions = useMemo(() => {
    const options = [
      { label: 'Project memory (./AGENTS.md)', value: 'project' },
      {
        label: `Global memory (~/.${productName.toLowerCase()}/AGENTS.md)`,
        value: 'global',
      },
    ].map((option, index) => ({
      label: `${index + 1}. ${option.label}`,
      value: option.value,
    }));
    return options;
  }, [productName]);

  useInput((input, key) => {
    const inputNum = parseInt(input, 10);
    if (key.escape) {
      memoryModal!.resolve(null);
    } else if (inputNum >= 1 && inputNum <= selectOptions.length) {
      const value = selectOptions[parseInt(input) - 1].value as
        | 'project'
        | 'global';
      memoryModal!.resolve(value);
    } else if (key.ctrl && input === 'c') {
      memoryModal!.resolve(null);
    }
  });

  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="round"
      borderColor={UI_COLORS.WARNING}
    >
      <Text color={UI_COLORS.WARNING} bold>
        Save Memory Rule
      </Text>

      <Box marginY={1}>
        <Text>{memoryModal!.rule}</Text>
      </Box>

      <Box marginY={1}>
        <Text bold>Select destination:</Text>
      </Box>

      <SelectInput
        items={selectOptions}
        onSelect={(item) =>
          memoryModal!.resolve(item.value as 'project' | 'global')
        }
      />
    </Box>
  );
}
