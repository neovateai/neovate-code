import { existsSync, readFileSync } from 'fs';
import { Box, Text } from 'ink';
import path from 'pathe';
import React, { useCallback, useMemo } from 'react';
import { TOOL_NAMES } from '../constants';
import type { ToolUse as ToolUseType } from '../tool';
import type { Question } from '../tools/askUserQuestion';
import { AskQuestionModal } from './AskQuestionModal';
import { UI_COLORS } from './constants';
import { DiffViewer } from './DiffViewer';
import { SelectInput, type SelectOption } from './SelectInput';
import { type ApprovalResult, useAppStore } from './store';
import { useTerminalSize } from './useTerminalSize';

interface ToolPreviewProps {
  toolUse: ToolUseType;
  cwd: string;
}

function TopDivider() {
  const { columns } = useTerminalSize();
  return (
    <Box marginBottom={1}>
      <Text color={UI_COLORS.CHAT_BORDER}>
        {'─'.repeat(Math.max(0, columns))}
      </Text>
    </Box>
  );
}

function DottedDivider() {
  const { columns } = useTerminalSize();
  return (
    <Box>
      <Text dimColor color="gray">
        {'·'.repeat(Math.max(0, columns))}
      </Text>
    </Box>
  );
}

function renderTitle(toolUse: ToolUseType, cwd: string): React.ReactNode {
  const { name, params } = toolUse;

  if (name === 'edit') {
    const relativeFilePath = getRelativePath(params.file_path, cwd);
    return (
      <Box marginBottom={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>
          Edit file{' '}
        </Text>
        <Text>{relativeFilePath}</Text>
      </Box>
    );
  }

  if (name === 'write') {
    const relativeFilePath = getRelativePath(params.file_path, cwd);
    const fullPath = path.isAbsolute(params.file_path)
      ? params.file_path
      : path.resolve(cwd, params.file_path);
    const isNew = !existsSync(fullPath);
    const action = isNew ? 'Create file ' : 'Update ';

    return (
      <Box marginBottom={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>
          {action}
        </Text>
        <Text>{relativeFilePath}</Text>
      </Box>
    );
  }

  if (name === 'bash') {
    return (
      <Box marginBottom={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>
          Bash command
        </Text>
      </Box>
    );
  }

  // 其他工具
  return (
    <Box marginBottom={1}>
      <Text bold color={UI_COLORS.ASK_PRIMARY}>
        Tool use
      </Text>
    </Box>
  );
}

function ToolPreview({ toolUse, cwd }: ToolPreviewProps) {
  const { name, params } = toolUse;

  if (name === 'edit' || name === 'write') {
    const { originalContent, newContent, fileName } = getDiffParams(
      toolUse,
      cwd,
    );

    return (
      <Box flexDirection="column" marginBottom={1}>
        <DottedDivider />
        <DiffViewer
          originalContent={originalContent}
          newContent={newContent}
          fileName={fileName}
        />
        <DottedDivider />
      </Box>
    );
  }

  if (name === 'bash') {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box marginLeft={2}>
          <Text>{params.command}</Text>
        </Box>
      </Box>
    );
  }

  // 其他工具显示参数
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginLeft={2}>
        <Text dimColor>{JSON.stringify(params, null, 2)}</Text>
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
          // Convert Record<string, string> to array format for tool schema
          const answersArray = updatedAnswers
            ? Object.entries(updatedAnswers).map(([question, answer]) => ({
                question,
                answer,
              }))
            : undefined;
          const shouldUpdateParams = answersArray && result !== 'deny';
          const newParams: Record<string, unknown> | undefined =
            shouldUpdateParams
              ? {
                  ...approvalModal.toolUse.params,
                  answers: answersArray,
                }
              : undefined;
          approvalModal.resolve(result, newParams);
        }}
      />
    );
  }

  return <ApprovalModalContent />;
}

function getQuestionText(toolUse: ToolUseType, cwd: string): string {
  const { name, params } = toolUse;

  switch (name) {
    case 'bash':
      return 'Do you want to proceed?';
    case 'edit': {
      const fileName = path.basename(params.file_path);
      return `Do you want to make this edit to ${fileName}?`;
    }
    case 'write': {
      const fullPath = path.isAbsolute(params.file_path)
        ? params.file_path
        : path.resolve(cwd, params.file_path);
      const isNew = !existsSync(fullPath);
      const fileName = path.basename(params.file_path);
      return isNew
        ? `Do you want to create ${fileName}?`
        : `Do you want to update ${fileName}?`;
    }
    default:
      return 'Do you want to proceed?';
  }
}

function ApprovalModalContent() {
  const { approvalModal, cwd } = useAppStore();

  const selectOptions = useMemo(() => {
    const { name, params } = approvalModal!.toolUse;
    const category = approvalModal!.category;

    // 选项 1：Yes
    const option1: SelectOption = {
      type: 'text',
      value: 'approve_once',
      label: 'Yes',
    };

    // 选项 2：根据 category 动态生成
    const option2: SelectOption =
      category === 'write'
        ? {
            type: 'text',
            value: 'approve_always_edit',
            label: 'Yes, allow all edits during this session',
          }
        : {
            type: 'text',
            value: 'approve_always_tool',
            label: `Yes, and don't ask again for ${name} commands in ${cwd}`,
          };

    // 选项 3：拒绝选项（bash/edit/write 支持输入）
    const supportsDenyInput = ['bash', 'edit', 'write'].includes(name);
    const option3: SelectOption = supportsDenyInput
      ? {
          type: 'input',
          value: 'deny',
          label: 'Type here to tell Claude what to do differently',
          placeholder: 'Type here to tell Claude what to do differently',
          initialValue: '',
        }
      : {
          type: 'text',
          value: 'deny',
          label: 'No, and tell Claude what to do differently (esc)',
        };

    return [option1, option2, option3];
  }, [approvalModal, cwd]);

  const questionText = useMemo(
    () => getQuestionText(approvalModal!.toolUse, cwd),
    [approvalModal, cwd],
  );

  const handleChange = useCallback(
    (value: string | string[]) => {
      if (typeof value === 'string') {
        // 判断是否是输入类型的拒绝选项
        const denyOption = selectOptions.find((opt) => opt.value === 'deny');
        if (denyOption?.type === 'input' && value !== 'deny') {
          // value 是用户输入的拒绝理由
          approvalModal!.resolve('deny', { denyReason: value });
        } else {
          // 普通选择
          approvalModal!.resolve(value as ApprovalResult);
        }
      }
    },
    [selectOptions, approvalModal],
  );

  const handleCancel = useCallback(() => {
    approvalModal!.resolve('deny');
  }, [approvalModal]);

  return (
    <Box flexDirection="column">
      <TopDivider />

      {renderTitle(approvalModal!.toolUse, cwd)}

      <ToolPreview toolUse={approvalModal!.toolUse} cwd={cwd} />

      <Box marginBottom={1}>
        <Text>{questionText}</Text>
      </Box>

      <SelectInput
        options={selectOptions}
        mode="single"
        onChange={handleChange}
        onCancel={handleCancel}
      />

      <Box marginTop={1}>
        <Text dimColor color={UI_COLORS.ASK_SECONDARY}>
          Esc to exit
        </Text>
      </Box>
    </Box>
  );
}

function getDiffParams(toolUse: ToolUseType, cwd: string) {
  const { file_path } = toolUse.params;
  const fullFilePath = path.isAbsolute(file_path)
    ? file_path
    : path.resolve(cwd, file_path);

  const relativeFilePath = getRelativePath(file_path, cwd);

  try {
    const oldContent = existsSync(fullFilePath)
      ? readFileSync(fullFilePath, 'utf-8')
      : '';

    let newContent: string;

    if (toolUse.name === 'edit') {
      // For edit tool, use old_string and new_string parameters
      const { old_string = '', new_string = '' } = toolUse.params;
      newContent = oldContent.replace(old_string, new_string);
    } else {
      // For write tool, use content parameter
      const { content = '' } = toolUse.params;
      newContent = content;
    }

    return {
      originalContent: oldContent,
      newContent: newContent,
      fileName: relativeFilePath,
    };
  } catch (error) {
    let newContent: string;

    if (toolUse.name === 'edit') {
      const { new_string = '' } = toolUse.params;
      newContent = new_string;
    } else {
      const { content = '' } = toolUse.params;
      newContent = content;
    }

    return {
      originalContent: '',
      newContent: newContent,
      fileName: relativeFilePath,
    };
  }
}

function getRelativePath(filePath: string, cwd: string): string {
  return path.isAbsolute(filePath) ? path.relative(cwd, filePath) : filePath;
}
