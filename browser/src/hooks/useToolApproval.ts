import { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { toolApprovalActions, toolApprovalState } from '@/state/toolApproval';

export interface UseToolApprovalReturn {
  // 状态
  pending: boolean;
  toolName: string | null;
  params: Record<string, any> | null;
  submitting: boolean;
  submitError: string | null;

  // 方法
  approveToolUse: (
    approved: boolean,
    option?: 'once' | 'always' | 'always_tool',
  ) => void;
  clearCurrentApproval: () => void;
  retrySubmit: () => void;
}

/**
 * 工具审批Hook - 管理UI状态和用户交互
 */
export function useToolApproval(): UseToolApprovalReturn {
  const approvalSnap = useSnapshot(toolApprovalState);

  const approveToolUse = useCallback(
    (approved: boolean, option: 'once' | 'always' | 'always_tool' = 'once') => {
      toolApprovalActions.approveToolUse(approved, option);
    },
    [],
  );

  const clearCurrentApproval = useCallback(() => {
    toolApprovalActions.clearCurrentApproval();
  }, []);

  const retrySubmit = useCallback(() => {
    toolApprovalActions.retrySubmit();
  }, []);

  return {
    pending: approvalSnap.pending,
    toolName: approvalSnap.toolName,
    params: approvalSnap.params,
    submitting: approvalSnap.submitting,
    submitError: approvalSnap.submitError,
    approveToolUse,
    clearCurrentApproval,
    retrySubmit,
  };
}
