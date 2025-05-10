import inquirer from 'inquirer';
import { logWarn } from './logger';

export const ApprovalModel = {
  suggest: 'suggest',
  'auto-edit': 'auto-edit',
  'full-auto': 'full-auto',
} as const;

const defaultApprovalModel = ApprovalModel.suggest;

export type ApprovalModel = (typeof ApprovalModel)[keyof typeof ApprovalModel];

export const getApprovalModel = (approvalModel: ApprovalModel) => {
  const model = approvalModel || process.env.APPROVAL_MODEL;

  if (!model) return defaultApprovalModel;
  const modelValue = ApprovalModel[model];

  if (!modelValue) {
    logWarn(
      `Invalid approval model: ${model}, using default: ${defaultApprovalModel}`,
    );
    return defaultApprovalModel;
  }

  return modelValue;
};

export const haveWritePermission = (approvalModel: ApprovalModel) => {
  return approvalModel !== ApprovalModel.suggest;
};

export const haveExecutePermission = (approvalModel: ApprovalModel) => {
  return approvalModel === ApprovalModel['full-auto'];
};

interface ApprovalPrompt {
  isApproved: boolean;
}

const deniedEditFileMessage = 'user denied to edit file';
export const requestWritePermission = async (
  approvalModel: ApprovalModel,
  filePath: string,
) => {
  if (!haveWritePermission(approvalModel)) {
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
  approvalModel: ApprovalModel,
  command: string,
) => {
  if (!haveExecutePermission(approvalModel)) {
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
