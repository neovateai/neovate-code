import { existsSync, readFileSync } from 'fs';
import { Box, Text, useInput } from 'ink';
import { useCallback, useMemo, useRef } from 'react';
import {
  commandExists,
  getEditorName,
  openFileInEditor,
} from '../../utils/externalEditor';
import { Markdown } from '../Markdown';
import { SelectInput, type SelectOption } from '../SelectInput';
import { useAppStore } from '../store';
import { useTerminalSize } from '../useTerminalSize';

export interface PlanApprovalViewProps {
  planFilePath: string;
  planContent: string | null;
  onApprove: (mode: 'autoEdit' | 'default' | 'yolo') => void;
  onDeny: (feedback: string) => void;
}

export function PlanApprovalView({
  planFilePath,
  planContent,
  onApprove,
  onDeny,
}: PlanApprovalViewProps) {
  const { columns } = useTerminalSize();
  const { productName, approvalMode } = useAppStore();
  const isEditingRef = useRef(false);

  const selectOptions = useMemo<SelectOption[]>(() => {
    // When approvalMode is 'autoEdit' or 'yolo', merge both options into a single 'Yes'
    // because edits will be auto-approved anyway
    if (approvalMode === 'autoEdit' || approvalMode === 'yolo') {
      return [
        {
          type: 'text',
          value: approvalMode,
          label: 'Yes',
        },
        {
          type: 'input',
          value: 'deny',
          label: `Type here to tell ${productName} what to change`,
          placeholder: `Type here to tell ${productName} what to change`,
          initialValue: '',
        },
      ];
    }

    // Default mode: show both options
    return [
      {
        type: 'text',
        value: 'autoEdit',
        // TODO Currently shift+tab switching is not supported, so shortcut key is not displayed for now
        label: 'Yes, and auto-accept edits',
      },
      {
        type: 'text',
        value: 'default',
        label: 'Yes, and manually approve edits',
      },
      {
        type: 'input',
        value: 'deny',
        label: `Type here to tell ${productName} what to change`,
        placeholder: `Type here to tell ${productName} what to change`,
        initialValue: '',
      },
    ];
  }, [productName, approvalMode]);

  const handleChange = useCallback(
    (value: string | string[]) => {
      if (typeof value === 'string') {
        if (value === 'autoEdit' || value === 'default' || value === 'yolo') {
          onApprove(value as 'autoEdit' | 'default' | 'yolo');
          return;
        }

        // For deny option with input
        // If value is not 'deny', it means user entered some text
        if (value !== 'deny') {
          // value is the rejection reason entered by the user
          onDeny(value);
        } else {
          // Normal selection (value === 'deny') or no input
          onDeny('');
        }
      }
    },
    [onApprove, onDeny],
  );

  const handleCancel = useCallback(() => {
    onDeny('');
  }, [onDeny]);

  // Handle external editor
  const handleEditPlanFile = useCallback(async () => {
    if (isEditingRef.current) {
      return; // Already editing, ignore
    }

    if (!planFilePath || !existsSync(planFilePath)) {
      return; // File doesn't exist, ignore
    }

    isEditingRef.current = true;
    try {
      const originalContent = planContent;
      const success = await openFileInEditor(planFilePath);

      if (success) {
        try {
          const updatedContent = readFileSync(planFilePath, 'utf-8');
          // Only update if content actually changed
          if (updatedContent !== originalContent) {
            useAppStore.getState().setPlanContent(updatedContent);
          }
        } catch (error) {
          // Silently fail on read error
          console.error('Failed to read plan file:', error);
        }
      }
    } finally {
      isEditingRef.current = false;
    }
  }, [planFilePath, planContent]);

  // Capture ctrl+g for external editor
  useInput(
    (input, key) => {
      if (key.ctrl && input === 'g') {
        handleEditPlanFile();
        return;
      }
      // Let other keys pass through to SelectInput
    },
    { isActive: true },
  );

  // Dynamic editor hint text
  const editorHintText = useMemo(() => {
    if (!planFilePath || !existsSync(planFilePath)) {
      return null;
    }

    const editorName = getEditorName();
    const displayName =
      editorName === 'cursor'
        ? 'Cursor'
        : editorName === 'code'
          ? 'VS Code'
          : null;

    if (displayName) {
      return `ctrl-g to edit in ${displayName} • ${planFilePath}`;
    }
    return `ctrl-g to edit file • ${planFilePath}`;
  }, [planFilePath]);

  const planPreview = planContent || '(No plan content)';

  return (
    <Box flexDirection="column">
      {/* Separator */}
      <Box marginBottom={1}>
        <Text color="cyan">{'─'.repeat(Math.max(0, columns))}</Text>
      </Box>

      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>Here is {productName}&apos;s plan:</Text>
      </Box>

      {/* Plan Content */}
      <Box flexDirection="column" marginBottom={1} paddingX={2}>
        <Markdown>{planPreview}</Markdown>
      </Box>

      {/* Separator */}
      <Box marginBottom={1}>
        <Text color="cyan">{'─'.repeat(Math.max(0, columns))}</Text>
      </Box>

      {/* Question */}
      <Box marginBottom={1}>
        <Text>How do you like to proceed?</Text>
      </Box>

      {/* SelectInput component handles all interaction */}
      <SelectInput
        options={selectOptions}
        mode="single"
        onChange={handleChange}
        onCancel={handleCancel}
      />

      {/* Help Text */}
      {editorHintText && (
        <Box marginTop={1}>
          <Text dimColor>{editorHintText}</Text>
        </Box>
      )}
    </Box>
  );
}
