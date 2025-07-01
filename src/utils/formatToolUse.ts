import { AgentInputItem } from '@openai/agents';

const USE_SIMPLIFIED_TOOL_FORMAT =
  process.env.USE_SIMPLIFIED_TOOL_FORMAT !== 'none';

interface ToolUse {
  name: string;
  params: Record<string, any>;
  result: Record<string, any>;
  callId: string;
}

export function formatToolUse(toolUse: ToolUse): AgentInputItem {
  const { name, params, result, callId } = toolUse;
  // Default to using simplified format. If you need to use the original format, set environment variable USE_SIMPLIFIED_TOOL_FORMAT=none
  if (USE_SIMPLIFIED_TOOL_FORMAT) {
    return {
      role: 'user',
      type: 'message',
      content: `[${name} for ${JSON.stringify(params)}] result: <function_results>\n${JSON.stringify(
        result,
      )}\n</function_results>`,
    };
  }

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
