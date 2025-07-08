import { proxy } from 'valtio';
import { submitToolApproval } from '@/api/toolApproval';
import type { CodeNormalViewerMode } from '@/types/codeViewer';
import type {
  ToolApprovalErrorMessage,
  ToolApprovalRequestMessage,
  ToolApprovalResultMessage,
} from '@/types/message';
import * as fileChanges from './fileChanges';

export interface EditPayload {
  path: string;
  edit: fileChanges.FileEdit;
  mode?: CodeNormalViewerMode;
}

export interface ToolApprovalState {
  // 当前审批状态
  pending: boolean;
  callId: string | null;
  toolName: string | null;
  params: Record<string, any> | null;
  editPayload?: EditPayload;

  // 提交状态
  submitting: boolean;
  submitError: string | null;
  lastSubmitOption: 'once' | 'always' | 'always_tool';

  // 当前的审批请求消息（用于UI显示）
  currentRequest: ToolApprovalRequestMessage | null;
}

export const toolApprovalState = proxy<ToolApprovalState>({
  pending: false,
  callId: null,
  toolName: null,
  params: null,
  submitting: false,
  submitError: null,
  lastSubmitOption: 'once',
  currentRequest: null,
});

export const toolApprovalActions = {
  // 处理来自后端的工具审批请求
  handleApprovalRequest: (message: ToolApprovalRequestMessage) => {
    toolApprovalState.pending = true;
    toolApprovalState.callId = message.toolCallId;
    toolApprovalState.toolName = message.toolName;
    toolApprovalState.params = message.args as Record<string, any>;
    toolApprovalState.currentRequest = message;
    toolApprovalState.submitError = null;

    if (message.toolName === 'edit' || message.toolName === 'write') {
      const { file_path, old_string, new_string, mode } = message.args as {
        file_path: string;
        old_string: string;
        new_string: string;
        mode?: CodeNormalViewerMode;
      };
      toolApprovalState.editPayload = {
        path: file_path,
        edit: {
          toolCallId: message.toolCallId,
          old_string,
          new_string,
        },
        mode,
      };
    }
  },

  // 处理审批结果
  handleApprovalResult: (_message: ToolApprovalResultMessage) => {
    toolApprovalState.pending = false;
    toolApprovalState.callId = null;
    toolApprovalState.toolName = null;
    toolApprovalState.params = null;
    toolApprovalState.currentRequest = null;
    toolApprovalState.submitting = false;
    toolApprovalState.submitError = null;
    toolApprovalState.lastSubmitOption = 'once';
    toolApprovalState.editPayload = undefined;
  },

  // 处理审批错误
  handleApprovalError: (message: ToolApprovalErrorMessage) => {
    toolApprovalState.submitting = false;
    toolApprovalState.submitError = message.error;
  },

  // 批准工具使用
  approveToolUse: async (
    approved: boolean,
    option: 'once' | 'always' | 'always_tool' = 'once',
  ) => {
    if (!toolApprovalState.callId) {
      return;
    }

    if (
      toolApprovalState.toolName === 'edit' &&
      toolApprovalState.editPayload &&
      option === 'once'
    ) {
      const { path, edit, mode } = toolApprovalState.editPayload;
      if (approved) {
        fileChanges.fileChangesActions.acceptEdit(path, edit, mode);
      } else {
        fileChanges.fileChangesActions.rejectEdit(path, edit, mode);
      }
    }

    toolApprovalState.submitting = true;
    toolApprovalState.submitError = null;
    toolApprovalState.lastSubmitOption = option;

    try {
      await submitToolApproval(toolApprovalState.callId, approved, option);
    } catch (error) {
      toolApprovalState.submitting = false;
      toolApprovalState.submitError =
        error instanceof Error ? error.message : String(error);
    }
  },

  // 清除当前审批状态（用于取消或重置）
  clearCurrentApproval: () => {
    toolApprovalState.pending = false;
    toolApprovalState.callId = null;
    toolApprovalState.toolName = null;
    toolApprovalState.params = null;
    toolApprovalState.currentRequest = null;
    toolApprovalState.submitting = false;
    toolApprovalState.submitError = null;
    toolApprovalState.lastSubmitOption = 'once';
    toolApprovalState.editPayload = undefined;
  },

  // 重试提交（在出错时使用）
  retrySubmit: () => {
    if (toolApprovalState.submitError && toolApprovalState.callId) {
      const lastOption = toolApprovalState.lastSubmitOption;
      toolApprovalActions.approveToolUse(true, lastOption);
    }
  },
};
