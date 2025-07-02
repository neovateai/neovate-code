import { useAppContext } from '../AppContext';
import { APP_STATUS } from '../constants';

export function useToolApproval() {
  const { state, dispatch } = useAppContext();

  const approveToolUse = (approved: boolean) => {
    if (state.approval.resolve) {
      state.approval.resolve(approved);
      dispatch({
        type: 'SET_APPROVAL_PENDING',
        payload: {
          pending: false,
          callId: null,
          toolName: null,
          params: null,
          resolve: null,
        },
      });
      dispatch({
        type: 'SET_STATUS',
        payload: approved ? APP_STATUS.TOOL_APPROVED : APP_STATUS.PROCESSING,
      });
    }
  };

  const handleToolApproval = async (
    callId: string,
    name: string,
    params: Record<string, any>,
  ): Promise<boolean> => {
    // Check approval memory first
    const toolKey = `${name}:${JSON.stringify(params)}`;
    const toolOnlyKey = name;

    if (
      state.approvalMemory.proceedAlways.has(toolKey) ||
      state.approvalMemory.proceedAlwaysTool.has(toolOnlyKey)
    ) {
      return true;
    }

    if (state.approvalMemory.proceedOnce.has(toolKey)) {
      dispatch({
        type: 'REMOVE_APPROVAL_MEMORY',
        payload: { type: 'once', key: toolKey },
      });
      return true;
    }

    // Show approval prompt
    dispatch({ type: 'SET_STATUS', payload: APP_STATUS.AWAITING_USER_INPUT });
    dispatch({
      type: 'SET_APPROVAL_PENDING',
      payload: {
        pending: true,
        callId,
        toolName: name,
        params,
      },
    });

    return new Promise<boolean>((resolve) => {
      dispatch({
        type: 'SET_APPROVAL_PENDING',
        payload: {
          pending: true,
          callId,
          toolName: name,
          params,
          resolve,
        },
      });
    });
  };

  const addApprovalMemory = (type: 'once' | 'always' | 'tool', key: string) => {
    dispatch({ type: 'ADD_APPROVAL_MEMORY', payload: { type, key } });
  };

  const clearApprovalMemory = () => {
    dispatch({ type: 'CLEAR_APPROVAL_MEMORY' });
  };

  const getToolKey = (toolName: string, params: Record<string, any>) => {
    return `${toolName}:${JSON.stringify(params)}`;
  };

  return {
    approveToolUse,
    handleToolApproval,
    addApprovalMemory,
    clearApprovalMemory,
    getToolKey,
  };
}
