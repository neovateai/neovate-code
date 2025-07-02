import { proxy } from 'valtio';
import { submitToolApproval } from '@/api/toolApproval';
import type {
  ToolApprovalErrorMessage,
  ToolApprovalRequestMessage,
  ToolApprovalResultMessage,
} from '@/types/message';

export interface ToolApprovalState {
  // 当前审批状态
  pending: boolean;
  callId: string | null;
  toolName: string | null;
  params: Record<string, any> | null;

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
  },

  // 处理审批结果
  handleApprovalResult: (message: ToolApprovalResultMessage) => {
    toolApprovalState.pending = false;
    toolApprovalState.callId = null;
    toolApprovalState.toolName = null;
    toolApprovalState.params = null;
    toolApprovalState.currentRequest = null;
    toolApprovalState.submitting = false;
    toolApprovalState.submitError = null;
    toolApprovalState.lastSubmitOption = 'once';
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
  },

  // 重试提交（在出错时使用）
  retrySubmit: () => {
    if (toolApprovalState.submitError && toolApprovalState.callId) {
      const lastOption = toolApprovalState.lastSubmitOption;
      toolApprovalActions.approveToolUse(true, lastOption);
    }
  },
};
