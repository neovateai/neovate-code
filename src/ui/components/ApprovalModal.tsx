import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import React from 'react';
import { useAppContext } from '../AppContext';
import {
  APPROVAL_OPTIONS,
  EDIT_APPROVAL_OPTIONS,
  UI_COLORS,
} from '../constants';
import { useMessageFormatting } from '../hooks/useMessageFormatting';
import { useToolApproval } from '../hooks/useToolApproval';
import DiffViewer from './DiffViewer';

interface ApprovalModalSelectInputProps {
  toolName: string;
  params: Record<string, any>;
}

function ApprovalModalSelectInput({
  toolName,
  params,
}: ApprovalModalSelectInputProps) {
  const {
    approveToolUse,
    addApprovalMemory,
    getToolKey,
    openWithExternalEditor,
  } = useToolApproval();
  const [error, setError] = React.useState<string | null>(null);

  const handleSelect = async (item: any) => {
    if (item.value === 'modify_with_editor') {
      try {
        setError(null);
        await openWithExternalEditor(toolName, params);
        // After successful modification, the modal will show updated diff
        // User can then approve or modify again
        return;
      } catch (error) {
        console.error('Failed to open external editor:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to open external editor';

        // Show user-friendly error messages
        if (errorMessage.includes('timeout')) {
          setError(
            'Editor timed out. Please try again with a shorter editing session.',
          );
        } else if (errorMessage.includes('Failed to start editor')) {
          setError(
            'Could not start external editor. Please check if the editor is installed.',
          );
        } else if (errorMessage.includes('too large')) {
          setError('File content is too large to edit externally.');
        } else {
          setError(`Editor error: ${errorMessage}`);
        }
        return;
      }
    }

    const approved = item.value !== 'deny';
    const toolKey = getToolKey(toolName, params);

    if (item.value === 'approve_always') {
      addApprovalMemory('always', toolKey);
    } else if (item.value === 'approve_always_tool') {
      addApprovalMemory('tool', toolName);
    }

    approveToolUse(approved);
  };

  // Use different options for edit tool vs other tools
  const baseOptions =
    toolName === 'edit' ? EDIT_APPROVAL_OPTIONS : APPROVAL_OPTIONS;
  const optionsWithToolName = baseOptions.map((option) =>
    option.value === 'approve_always_tool'
      ? { ...option, label: `Yes (always for ${toolName})` }
      : option,
  ) as any[];

  return (
    <>
      {error && (
        <Box marginY={1}>
          <Text color={UI_COLORS.ERROR}>Error: {error}</Text>
        </Box>
      )}
      <SelectInput items={optionsWithToolName} onSelect={handleSelect} />
    </>
  );
}

interface ToolDetailsProps {
  toolName: string;
  params: Record<string, any>;
}

function ToolDetails({ toolName, params }: ToolDetailsProps) {
  const { getToolDescription } = useMessageFormatting();
  const description = getToolDescription(toolName, params);

  if (toolName === 'edit') {
    return (
      <DiffViewer
        originalContent={params.old_string}
        newContent={params.new_string}
        fileName={params.file_path}
      />
    );
  }

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

  const { toolName, params, isModifying } = state.approval;

  // Show modification in progress state
  if (isModifying) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={UI_COLORS.INFO}
        padding={1}
        justifyContent="center"
        alignItems="center"
      >
        <Text bold color={UI_COLORS.INFO}>
          External Editor Active
        </Text>
        <Text color={UI_COLORS.SUCCESS}>
          Save and close external editor to continue
        </Text>
      </Box>
    );
  }

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
