import { AgentInputItem } from '@openai/agents';

interface ToolResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

interface ToolUse {
  name: string;
  params: Record<string, any>;
  result: ToolResult | string;
  callId: string;
}

export function createStableToolKey(
  toolName: string,
  params: Record<string, any>,
): string {
  const sortedParams = Object.fromEntries(
    Object.entries(params).sort(([a], [b]) => a.localeCompare(b)),
  );
  return `${toolName}:${JSON.stringify(sortedParams)}`;
}

const TOOL_NAMES = {
  READ: 'read',
  BASH: 'bash',
  EDIT: 'edit',
  WRITE: 'write',
  FETCH: 'fetch',
  GLOB: 'glob',
  GREP: 'grep',
  LS: 'ls',
} as const;

function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return '[Unable to serialize object]';
  }
}

const TOOL_DESCRIPTIONS: Record<
  string,
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

function formatToolDescription(tool: ToolUse): string {
  const getDescription = TOOL_DESCRIPTIONS[tool.name];
  if (getDescription && tool.params) {
    return `[${tool.name} for '${getDescription(tool.params)}']`;
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

  if (!result?.success) {
    return `The tool execution failed with the following error:\n<error>\n${result.error || 'Unknown error occurred'}\n</error>`;
  }

  const resultData = result.data
    ? `\n<function_results_data>\n${safeStringify(result.data)}\n</function_results_data>\n`
    : '';

  return `${result.message}${resultData}`;
}

function createAssistantFormatItem(
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
        text: safeStringify({
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
    content: `[${name} for ${safeStringify(params)}] result: \n<function_results>\n${safeStringify(
      result,
    )}\n</function_results>`,
  };
}

export function formatToolUse(toolUse: ToolUse): AgentInputItem {
  const { name, result, callId } = toolUse;

  // Default to using original format. Set environment variable USE_ASSISTANT_TOOL_FORMAT=1 to enable simplified format
  if (process.env.USE_ASSISTANT_TOOL_FORMAT === '1') {
    return createAssistantFormatItem(name, result, callId);
  }

  return createUserFormatItem(toolUse);
}
