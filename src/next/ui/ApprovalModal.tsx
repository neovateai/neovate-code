import { Box, Newline, Text } from 'ink';
import { useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { useMemo } from 'react';
import { type ApprovalResult, useAppStore } from './store';

export function ApprovalModal() {
  const { approvalModal } = useAppStore();
  if (!approvalModal) {
    return null;
  }
  return <ApprovalModalContent />;
}

function ApprovalModalContent() {
  const approvalModal = useAppStore().approvalModal!;
  const selectOptions = useMemo(() => {
    const options = [
      { label: 'Yes (once)', value: 'approve_once' },
      ...(approvalModal.category === 'write'
        ? [
            {
              label: `Yes, allow all edits during this session`,
              value: 'approve_always_edit',
            },
          ]
        : []),
      {
        label: `Yes, allow ${approvalModal.toolUse.name} during this session`,
        value: 'approve_always_tool',
      },
      { label: 'No, and suggest changes (esc)', value: 'deny' },
    ].map((option, index) => ({
      label: `${index + 1}. ${option.label}`,
      value: option.value,
    }));
    return options;
  }, [approvalModal]);
  useInput((input, key) => {
    // if esc, approvalModal.resolve with deny
    // if press 1-selectOptions.length, approvalModal.resolve with the value of selectOptions[input - 1]
    // if ctrl-c, approvalModal.resolve with deny
    const inputNum = parseInt(input, 10);
    if (key.escape) {
      approvalModal.resolve('deny');
    } else if (inputNum >= 1 && inputNum <= selectOptions.length) {
      const value = selectOptions[parseInt(input) - 1].value as ApprovalResult;
      approvalModal.resolve(value);
    } else if (key.ctrl && input === 'c') {
      approvalModal.resolve('deny');
    }
  });
  const { toolUse } = approvalModal;
  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="round"
      borderColor="yellow"
    >
      <Text color="yellow" bold>
        Tool Approval Required
      </Text>
      <Newline />
      <Text>
        <Text bold>Tool:</Text> {toolUse.name}
      </Text>
      <Newline />
      <Text bold>Parameters:</Text>
      <Text>{JSON.stringify(toolUse.params, null, 2)}</Text>
      <Newline />
      <Text bold>Approval Options:</Text>
      <SelectInput
        items={selectOptions}
        onSelect={(item) => approvalModal.resolve(item.value as ApprovalResult)}
      />
    </Box>
  );
}
