import { AgentInputItem } from '@openai/agents';
import { isArray, isPlainObject } from 'lodash-es';
import { TOOL_NAMES } from '../ui/constants.js';

type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

interface ToolResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  type?: 'image' | 'text';
  mimeType?: string;
}

interface ToolUse {
  name: string;
  params: Record<string, any>;
  result: ToolResult | string;
  callId: string;
}

interface ImageData {
  type: 'image';
  data: string;
  mimeType: string;
}

const isImageData = (data: any): data is ImageData =>
  isPlainObject(data) && data.type === 'image';

const isUrl = (data: string): boolean =>
  data.startsWith('http://') || data.startsWith('https://');

const isSuccessToolResult = (result: any): result is ToolResult =>
  isPlainObject(result) && 'success' in result;

const TOOL_DESCRIPTIONS: Record<
  ToolName,
  (params: Record<string, any>) => string
> = {
  [TOOL_NAMES.READ]: (params) => `file_path: ${params.file_path}`,
  [TOOL_NAMES.BASH]: (params) => `command: ${params.command}`,
  [TOOL_NAMES.EDIT]: (params) => `file_path: ${params.file_path}`,
  [TOOL_NAMES.WRITE]: (params) => `file_path: ${params.file_path}`,
  [TOOL_NAMES.FETCH]: (params) => `url: ${params.url}`,
  [TOOL_NAMES.GLOB]: (params) => `pattern: ${params.pattern}`,
  [TOOL_NAMES.GREP]: (params) => `pattern: ${params.pattern}`,
  [TOOL_NAMES.LS]: (params) => `dir_path: ${params.dir_path}`,
};

function parseImageData(data: string, mimeType: string): string {
  return isUrl(data) ? data : `data:${mimeType};base64,${data}`;
}

export function createStableToolKey(
  toolName: string,
  params: Record<string, any>,
): string {
  const sortedEntries = Object.entries(params).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const sortedParams = Object.fromEntries(sortedEntries);
  return `${toolName}:${JSON.stringify(sortedParams)}`;
}

function safeStringify(
  obj: any,
  fallbackMessage = '[Unable to serialize object]',
): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return fallbackMessage;
  }
}

function formatToolDescription(tool: ToolUse): string {
  const getDescription = TOOL_DESCRIPTIONS[tool.name as ToolName];
  if (getDescription && tool.params) {
    try {
      return `[${tool.name} for '${getDescription(tool.params)}']`;
    } catch (error) {
      return `[${tool.name}]`;
    }
  }
  return `[${tool.name}]`;
}

function formatToolResult(result: any): string {
  if (typeof result === 'string') {
    return result;
  }

  if (!result) {
    return '(tool did not return anything)';
  }

  if (!isSuccessToolResult(result)) {
    return `\n<function_results_data>\n${safeStringify(result)}\n</function_results_data>\n`;
  }

  if (!result.success) {
    const errorMessage = result.error || 'Unknown error occurred';
    return `The tool execution failed with the following error:\n<error>\n${errorMessage}\n</error>`;
  }

  const resultData = result.data
    ? `\n<function_results_data>\n${safeStringify(result.data)}\n</function_results_data>\n`
    : '';

  return `${result.message || ''}${resultData}`;
}

function createImageInputItem(data: string, mimeType: string): AgentInputItem {
  return {
    role: 'user',
    type: 'message',
    content: [
      {
        type: 'input_image',
        image: parseImageData(data, mimeType),
        providerData: { mimeType },
      },
    ],
  };
}

function createAssistantToolFormatItem(
  name: string,
  result: ToolResult | string,
  callId: string,
): AgentInputItem {
  return {
    role: 'assistant',
    type: 'message',
    content: [
      {
        type: 'output_text',
        text: JSON.stringify({
          type: 'function_call_result',
          name,
          result,
          callId,
        }),
      },
    ],
    status: 'completed',
  };
}

function createMultipleImagesInputItem(
  name: string,
  params: Record<string, any>,
  result: any[],
): AgentInputItem {
  return {
    role: 'user',
    type: 'message',
    content: result.map((item) => {
      if (isImageData(item)) {
        return {
          type: 'input_image',
          image: parseImageData(item.data, item.mimeType),
          providerData: { mimeType: item.mimeType },
        };
      }

      const paramsText = params ? ` for ${safeStringify(params)}` : '';
      return {
        type: 'input_text',
        text: `[${name}${paramsText}] result: \n<function_results>\n${safeStringify(item)}\n</function_results>`,
      };
    }),
  };
}

function createUserFormatItem(toolUse: ToolUse): AgentInputItem {
  if (process.env.USE_DETAILED_TOOL_FORMAT === '1') {
    const formattedResult = formatToolResult(toolUse.result);
    const description = formatToolDescription(toolUse);

    return {
      role: 'user',
      type: 'message',
      content: `${description} Result: \n <function_results>\n${formattedResult}\n</function_results>`,
    };
  }

  const { name, params, result } = toolUse;
  return {
    role: 'user',
    type: 'message',
    content: `[${name} for ${safeStringify(params)}] result: \n<function_results>\n${safeStringify(result)}\n</function_results>`,
  };
}

export function formatToolUse(toolUse: ToolUse): AgentInputItem {
  const { name, params, result, callId } = toolUse;

  if (
    name === TOOL_NAMES.READ &&
    isSuccessToolResult(result) &&
    result.success &&
    result.type === 'image'
  ) {
    return createImageInputItem(result.data, result.mimeType!);
  }

  if (isImageData(result)) {
    return createImageInputItem(result.data, result.mimeType);
  }

  if (isArray(result) && result.some(isImageData)) {
    return createMultipleImagesInputItem(name, params, result);
  }

  if (process.env.USE_ASSISTANT_TOOL_FORMAT === '1') {
    return createAssistantToolFormatItem(name, result, callId);
  }

  return createUserFormatItem(toolUse);
}
