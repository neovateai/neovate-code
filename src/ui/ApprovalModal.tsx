import { existsSync, readFileSync } from 'fs';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import path from 'pathe';
import React, { useMemo } from 'react';
import { TOOL_NAMES } from '../constants';
import type { ToolUse as ToolUseType } from '../tool';
import type { Question } from '../tools/askUserQuestion';
import { AskQuestionModal } from './AskQuestionModal';
import { UI_COLORS } from './constants';
import { DiffViewer } from './DiffViewer';
import { type ApprovalResult, useAppStore } from './store';

interface ToolPreviewProps {
  toolUse: ToolUseType;
  cwd: string;
}

function ToolPreview({ toolUse, cwd }: ToolPreviewProps) {
  const { name, params } = toolUse;

  if (name === 'edit' || name === 'write') {
    const { originalContent, newContent, fileName } = getDiffParams(
      toolUse,
      cwd,
    );

    return (
      <Box flexDirection="column">
        <Box marginY={1}>
          <Text bold color={UI_COLORS.TOOL}>
            {name}
          </Text>
          <Text color="gray"> {fileName}</Text>
        </Box>
        <DiffViewer
          originalContent={originalContent}
          newContent={newContent}
          fileName={fileName}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginY={1}>
        <Text bold color={UI_COLORS.TOOL}>
          {name}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        padding={1}
      >
        <Text bold>Parameters:</Text>
        <Text color="gray">{JSON.stringify(params, null, 2)}</Text>
      </Box>
    </Box>
  );
}

export function ApprovalModal() {
  const { approvalModal } = useAppStore();
  if (!approvalModal) {
    return null;
  }

  // Special handling for askUserQuestion tool
  if (approvalModal?.toolUse.name === TOOL_NAMES.ASK_USER_QUESTION) {
    const questions = (approvalModal?.toolUse.params.questions ||
      []) as Question[];

    // Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      return (
        <Box
          flexDirection="column"
          padding={1}
          borderStyle="round"
          borderColor="red"
        >
          <Text color="red" bold>
            Invalid Questions
          </Text>
          <Text>No questions provided to askUserQuestion tool</Text>
        </Box>
      );
    }

    return (
      <AskQuestionModal
        questions={questions}
        onResolve={(result, updatedAnswers) => {
          if (result === 'approve_once' && updatedAnswers) {
            // Update the toolUse params with answers before resolving
            approvalModal.toolUse.params.answers = updatedAnswers;
          }
          approvalModal.resolve(result);
        }}
      />
    );
  }

  return <ApprovalModalContent />;
}

function ApprovalModalContent() {
  const { approvalModal, cwd } = useAppStore();

  const selectOptions = useMemo(() => {
    const options = [
      { label: 'Yes (once)', value: 'approve_once' },
      ...(approvalModal!.category === 'write'
        ? [
            {
              label: `Yes, allow all edits during this session`,
              value: 'approve_always_edit',
            },
          ]
        : []),
      {
        label: `Yes, allow ${approvalModal!.toolUse.name} during this session`,
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
    const inputNum = parseInt(input, 10);
    if (key.escape) {
      approvalModal!.resolve('deny');
    } else if (inputNum >= 1 && inputNum <= selectOptions.length) {
      const value = selectOptions[parseInt(input) - 1].value as ApprovalResult;
      approvalModal!.resolve(value);
    } else if (key.ctrl && input === 'c') {
      approvalModal!.resolve('deny');
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
        Tool Approval Required
      </Text>

      <ToolPreview toolUse={approvalModal!.toolUse} cwd={cwd} />

      <Box marginY={1}>
        <Text bold>Approval Options:</Text>
      </Box>

      <SelectInput
        items={selectOptions}
        onSelect={(item) =>
          approvalModal!.resolve(item.value as ApprovalResult)
        }
      />
    </Box>
  );
}

function getDiffParams(toolUse: ToolUseType, cwd: string) {
  const { content = '', file_path } = toolUse.params;
  const fullFilePath = path.isAbsolute(file_path)
    ? file_path
    : path.resolve(cwd, file_path);

  const relativeFilePath = getRelativePath(file_path, cwd);

  try {
    const oldContent = existsSync(fullFilePath)
      ? readFileSync(fullFilePath, 'utf-8')
      : '';
    return {
      originalContent: oldContent,
      newContent: content,
      fileName: relativeFilePath,
    };
  } catch (error) {
    return {
      originalContent: '',
      newContent: content,
      fileName: relativeFilePath,
    };
  }
}

function getRelativePath(filePath: string, cwd: string): string {
  return path.isAbsolute(filePath) ? path.relative(cwd, filePath) : filePath;
}
