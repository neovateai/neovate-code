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
    console.log('收到工具审批请求:', message);

    // 直接需要用户审批，不再检查前端记忆
    toolApprovalState.pending = true;
    toolApprovalState.callId = message.toolCallId;
    toolApprovalState.toolName = message.toolName;
    toolApprovalState.params = message.args as Record<string, any>;
    toolApprovalState.currentRequest = message;
    toolApprovalState.submitError = null;

    console.log('需要用户审批', toolApprovalState);
  },

  // 处理审批结果
  handleApprovalResult: (message: ToolApprovalResultMessage) => {
    console.log('收到审批结果:', message);

    // 重置状态
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
    console.log('收到审批错误:', message);

    toolApprovalState.submitting = false;
    toolApprovalState.submitError = message.error;

    // 不重置其他状态，让用户可以重试
  },

  // 批准工具使用
  approveToolUse: async (
    approved: boolean,
    option: 'once' | 'always' | 'always_tool' = 'once',
  ) => {
    if (!toolApprovalState.callId) {
      console.error('没有待审批的请求');
      return;
    }

    console.log('提交审批结果:', approved, option, toolApprovalState.callId);

    toolApprovalState.submitting = true;
    toolApprovalState.submitError = null;
    toolApprovalState.lastSubmitOption = option;

    try {
      // 向后端提交审批结果，审批记忆由后端管理
      await submitToolApproval(toolApprovalState.callId, approved, option);

      console.log('审批结果提交成功');

      // 注意：不在这里重置状态，等待后端的确认消息
    } catch (error) {
      console.error('提交工具审批结果失败:', error);

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
      // 清除错误状态并重试上次的操作
      const lastOption = toolApprovalState.lastSubmitOption;
      toolApprovalActions.approveToolUse(true, lastOption);
    }
  },
};
