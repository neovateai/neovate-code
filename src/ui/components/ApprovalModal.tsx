import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import React from 'react';
import { useAppContext } from '../AppContext';
import { APPROVAL_OPTIONS, UI_COLORS } from '../constants';
import { useMessageFormatting } from '../hooks/useMessageFormatting';
import { useToolApproval } from '../hooks/useToolApproval';

interface ApprovalModalSelectInputProps {
  toolName: string;
  params: Record<string, any>;
}

function ApprovalModalSelectInput({
  toolName,
  params,
}: ApprovalModalSelectInputProps) {
  const { approveToolUse, addApprovalMemory, getToolKey } = useToolApproval();

  const handleSelect = (item: any) => {
    const approved = item.value !== 'deny';
    const toolKey = getToolKey(toolName, params);

    if (item.value === 'approve_always') {
      addApprovalMemory('always', toolKey);
    } else if (item.value === 'approve_always_tool') {
      addApprovalMemory('tool', toolName);
    }

    approveToolUse(approved);
  };

  const optionsWithToolName = APPROVAL_OPTIONS.map((option) =>
    option.value === 'approve_always_tool'
      ? { ...option, label: `Yes (always for ${toolName})` }
      : option,
  ) as any[];

  return <SelectInput items={optionsWithToolName} onSelect={handleSelect} />;
}

interface ToolDetailsProps {
  toolName: string;
  params: Record<string, any>;
}

function ToolDetails({ toolName, params }: ToolDetailsProps) {
  const { getToolDescription } = useMessageFormatting();
  const description = getToolDescription(toolName, params);

  return (
    <>
      <Box marginY={1}>
        <Text>
          <Text bold color={UI_COLORS.TOOL}>
            {toolName}
          </Text>
          {description && (
            <Text color={UI_COLORS.SUCCESS}> ({description})</Text>
          )}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        padding={1}
        marginY={1}
      >
        <Text bold>Parameters:</Text>
        <Text color="gray">{JSON.stringify(params, null, 2)}</Text>
      </Box>
    </>
  );
}

export function ApprovalModal() {
  const { state } = useAppContext();

  if (
    !state.approval.pending ||
    !state.approval.toolName ||
    !state.approval.params
  ) {
    return null;
  }

  const { toolName, params } = state.approval;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={UI_COLORS.WARNING}
      padding={1}
    >
      <Text bold color={UI_COLORS.WARNING}>
        Tool Approval Required
      </Text>

      <ToolDetails toolName={toolName} params={params} />

      <Box marginY={1}>
        <Text bold>Do you want to allow this tool execution?</Text>
      </Box>

      <ApprovalModalSelectInput toolName={toolName} params={params} />
    </Box>
  );
}
