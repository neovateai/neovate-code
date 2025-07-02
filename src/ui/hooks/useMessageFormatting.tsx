import { useAppContext } from '../AppContext';
import {
  APP_STATUS,
  STATUS_MESSAGES,
  TOOL_DESCRIPTION_EXTRACTORS,
  TOOL_RESULT_FORMATTERS,
} from '../constants';

export function useMessageFormatting() {
  const { state } = useAppContext();

  const getToolDescription = (
    toolName: string,
    args: Record<string, any>,
  ): string => {
    const extractor =
      TOOL_DESCRIPTION_EXTRACTORS[
        toolName as keyof typeof TOOL_DESCRIPTION_EXTRACTORS
      ];
    return extractor ? extractor(args) : '';
  };

  const formatToolResult = (toolName: string, result: any): string => {
    const formatter =
      TOOL_RESULT_FORMATTERS[toolName as keyof typeof TOOL_RESULT_FORMATTERS];

    if (!result.success && result.error) {
      return result.error;
    }

    const formatted = formatter ? formatter(result) : '';
    return formatted || JSON.stringify(result);
  };

  const getStatusMessage = (
    status: string,
    isPlan: boolean,
    currentExecutingTool: any,
  ): string => {
    if (status === APP_STATUS.TOOL_EXECUTING && currentExecutingTool) {
      return `Executing ${currentExecutingTool.name}${
        currentExecutingTool.description
          ? ` (${currentExecutingTool.description})`
          : ''
      }...`;
    }

    if (status === APP_STATUS.PROCESSING) {
      return isPlan
        ? STATUS_MESSAGES[APP_STATUS.PROCESSING + '_plan']
        : STATUS_MESSAGES[APP_STATUS.PROCESSING];
    }

    return (
      STATUS_MESSAGES[status as keyof typeof STATUS_MESSAGES] ||
      (isPlan ? 'Planning...' : 'Processing...')
    );
  };

  const getCurrentStatusMessage = (): string => {
    const isPlan = state.stage === 'plan';
    return getStatusMessage(state.status, isPlan, state.currentExecutingTool);
  };

  return {
    getToolDescription,
    formatToolResult,
    getStatusMessage,
    getCurrentStatusMessage,
  };
}
