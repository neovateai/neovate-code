import path from 'path';
import { createStableToolKey } from '../../utils/formatToolUse';
import { useAppContext } from '../AppContext';
import { APP_STATUS } from '../constants';
import { openInExternalEditor } from '../utils/external-editor';

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
    const toolKey = createStableToolKey(name, params);
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
    return createStableToolKey(toolName, params);
  };

  const openWithExternalEditor = async (
    toolName: string,
    params: Record<string, any>,
  ) => {
    if (toolName !== 'edit') {
      throw new Error('External editor is only supported for edit tool');
    }

    try {
      // Set modifying state
      dispatch({
        type: 'SET_APPROVAL_PENDING',
        payload: {
          pending: true,
          callId: state.approval.callId,
          toolName,
          params,
          resolve: state.approval.resolve,
          isModifying: true,
        },
      });

      // Get current content and open in external editor
      // Use new_string if it exists (from previous modifications), otherwise old_string
      const currentContent = params.new_string || params.old_string || '';
      const fileName = params.file_path
        ? path.basename(params.file_path)
        : undefined;
      const fileExtension = fileName
        ? path.extname(fileName) || '.txt'
        : '.txt';

      const modifiedContent = await openInExternalEditor({
        content: currentContent,
        fileName,
        fileExtension,
        originalContent: params.old_string || '',
        showDiff: true,
        editorCommand: state.externalEditor,
      });

      // Update params with modified content
      const updatedParams = {
        ...params,
        new_string: modifiedContent,
      };

      // Reset modifying state and update params
      dispatch({
        type: 'SET_APPROVAL_PENDING',
        payload: {
          pending: true,
          callId: state.approval.callId,
          toolName,
          params: updatedParams,
          resolve: state.approval.resolve,
          isModifying: false,
        },
      });

      return true;
    } catch (error) {
      // Reset modifying state on error
      dispatch({
        type: 'SET_APPROVAL_PENDING',
        payload: {
          pending: true,
          callId: state.approval.callId,
          toolName,
          params,
          resolve: state.approval.resolve,
          isModifying: false,
        },
      });

      console.error('External editor error:', error);
      throw error;
    }
  };

  return {
    approveToolUse,
    handleToolApproval,
    addApprovalMemory,
    clearApprovalMemory,
    getToolKey,
    openWithExternalEditor,
  };
}
