import inquirer from 'inquirer';
import { logWarn } from '../v2/utils/logger';

export const ApprovalMode = {
  suggest: 'suggest',
  'auto-edit': 'auto-edit',
  'full-auto': 'full-auto',
} as const;

const defaultApprovalMode = ApprovalMode.suggest;

export type ApprovalMode = (typeof ApprovalMode)[keyof typeof ApprovalMode];

export const getApprovalMode = (approvalMode: ApprovalMode) => {
  const model = approvalMode || process.env.APPROVAL_MODE;

  if (!model) return defaultApprovalMode;
  const modelValue = ApprovalMode[model];

  if (!modelValue) {
    logWarn(
      `Invalid approval model: ${model}, using default: ${defaultApprovalMode}`,
    );
    return defaultApprovalMode;
  }

  return modelValue;
};

export const haveWritePermission = (approvalMode: ApprovalMode) => {
  return approvalMode !== ApprovalMode.suggest;
};

export const haveExecutePermission = (approvalMode: ApprovalMode) => {
  return approvalMode === ApprovalMode['full-auto'];
};

interface ApprovalPrompt {
  isApproved: boolean;
}

const deniedEditFileMessage = 'user denied to edit file';
export const requestWritePermission = async (
  approvalMode: ApprovalMode,
  filePath: string,
) => {
  if (!haveWritePermission(approvalMode)) {
    const { isApproved } = await inquirer.prompt<ApprovalPrompt>([
      {
        type: 'confirm',
        name: 'isApproved',
        message: `Do you want to approve the edit to ${filePath}? (Default: Yes)`,
        default: true,
      },
    ]);

    if (!isApproved) {
      logWarn(deniedEditFileMessage);
      throw new Error(deniedEditFileMessage);
    }
  }
};

const deniedExecuteCommandMessage = 'user denied to execute command';
export const requestExecutePermission = async (
  approvalMode: ApprovalMode,
  command: string,
) => {
  if (!haveExecutePermission(approvalMode)) {
    const { isApproved } = await inquirer.prompt<ApprovalPrompt>([
      {
        type: 'confirm',
        name: 'isApproved',
        message: `Do you want to approve the execution of "${command}"? (Default: Yes)`,
        default: true,
      },
    ]);

    if (!isApproved) {
      logWarn(deniedExecuteCommandMessage);
      throw new Error(deniedExecuteCommandMessage);
    }
  }
};
