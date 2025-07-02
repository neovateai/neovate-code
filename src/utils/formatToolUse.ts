import { AgentInputItem } from '@openai/agents';

interface ToolUse {
  name: string;
  params: Record<string, any>;
  result: Record<string, any>;
  callId: string;
}

export function formatToolUse(toolUse: ToolUse): AgentInputItem {
  const { name, params, result, callId } = toolUse;
  // Default to using original format. Set environment variable USE_ASSISTANT_TOOL_FORMAT=1 to enable simplified format
  if (process.env.USE_ASSISTANT_TOOL_FORMAT === '1') {
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

  return {
    role: 'user',
    type: 'message',
    content: `[${name} for ${JSON.stringify(params)}] result: <function_results>\n${JSON.stringify(
      result,
    )}\n</function_results>`,
  };
}
