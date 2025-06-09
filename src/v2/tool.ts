import { FunctionTool } from '@openai/agents';

export class Tools {
  tools: Record<string, FunctionTool>;

  constructor(tools: FunctionTool<any, any, any>[]) {
    this.tools = tools.reduce(
      (acc, tool) => {
        acc[tool.name] = tool;
        return acc;
      },
      {} as Record<string, FunctionTool>,
    );
  }

  async invoke(toolName: string, args: string, runContext: any) {
    const tool = this.tools[toolName];
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    return await tool.invoke(runContext, args);
  }

  getToolsPrompt() {
    const availableTools = `
  ${Object.entries(this.tools)
    .map(([key, tool]) => {
      return `
<tool>
<name>${key}</name>
<description>${tool.description}</description>
<input_json_schema>${JSON.stringify(tool.parameters)}</input_json_schema>
</tool>
  `.trim();
    })
    .join('\n')}
  `;
    return `
# TOOLS

You only have access to the tools provided below. You can only use one tool per message, and will receive the result of that tool use in the user's response. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use.

## Tool Use Formatting
Tool use is formatted using XML-style tags. The tool use is enclosed in <use_tool></use_tool> and each parameter is similarly enclosed within its own set of tags.

Description: Tools have defined input schemas that specify required and optional parameters.

Parameters:
- tool_name: (required) The name of the tool to execute
- arguments: (required) A JSON object containing the tool's input parameters, following the tool's input schema, quotes within string must be properly escaped, ensure it's valid JSON

Usage:
<use_tool>
  <tool_name>tool name here</tool_name>
  <arguments>
    {"param1": "value1","param2": "value2 \"escaped string\""}
  </arguments>
</use_tool>

When using tools, the tool use must be placed at the end of your response, top level, and not nested within other tags. Do not call tools when you don't have enough information.

Always adhere to this format for the tool use to ensure proper parsing and execution.

## Available Tools

${availableTools}
    `;
  }
}
