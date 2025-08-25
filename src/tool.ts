import { type FunctionTool, type Tool } from '@openai/agents';
import { validateToolParams } from './utils/tools';

export type ApprovalContext = {
  toolName: string;
  params: Record<string, any>;
  approvalMode: string;
  context: any;
};

export type ToolApprovalInfo = {
  needsApproval?: (context: ApprovalContext) => Promise<boolean> | boolean;
  category?: 'read' | 'write' | 'command' | 'network';
  riskLevel?: 'low' | 'medium' | 'high';
};

export type EnhancedTool = Tool<any> & {
  approval?: ToolApprovalInfo;
  readonly __isMcpTool?: boolean;
};

export function enhanceTool(
  tool: Tool<any>,
  approval?: ToolApprovalInfo,
): EnhancedTool {
  return {
    ...tool,
    approval,
  };
}

export class Tools {
  tools: Record<string, EnhancedTool>;

  constructor(tools: EnhancedTool[]) {
    this.tools = tools.reduce(
      (acc, tool) => {
        acc[tool.name] = tool;
        return acc;
      },
      {} as Record<string, EnhancedTool>,
    );
  }

  async invoke(toolName: string, args: string, runContext: any) {
    const tool = this.tools[toolName];
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolName} not found`,
      };
    }
    if (tool.type === 'function') {
      const result = validateToolParams(tool.originalParameters, args);
      if (!result.success) {
        return {
          success: false,
          error: `Invalid tool parameters: ${result.error}`,
        };
      }
      return await tool.invoke(runContext, args);
    } else {
      return {
        success: false,
        error: `Tool ${toolName} is not a function tool`,
      };
    }
  }

  async shouldApprove(
    toolName: string,
    params: Record<string, any>,
    context: any,
  ): Promise<boolean> {
    const tool = this.tools[toolName];
    if (!tool?.approval?.needsApproval) {
      return this.getDefaultApproval(toolName, params, context);
    }

    const approvalContext: ApprovalContext = {
      toolName,
      params,
      approvalMode: context.config.approvalMode,
      context,
    };

    const customApproval = await tool.approval.needsApproval(approvalContext);
    return customApproval;
  }

  private getDefaultApproval(
    toolName: string,
    params: Record<string, any>,
    context: any,
  ): boolean {
    const approvalMode = context.config.approvalMode;
    const tool = this.tools[toolName];

    // Get tool category for default approval logic
    const category =
      tool?.approval?.category || this.inferToolCategory(toolName);

    switch (approvalMode) {
      case 'yolo':
        return false; // Never require approval
      case 'autoEdit':
        return category === 'command'; // Only require approval for commands
      case 'default':
        return category !== 'read'; // Require approval for non-read operations
      default:
        return true; // Default to requiring approval
    }
  }

  private inferToolCategory(
    toolName: string,
  ): 'read' | 'write' | 'command' | 'network' {
    const readTools = ['read', 'ls', 'glob', 'grep'];
    const writeTools = ['write', 'edit'];
    const commandTools = ['bash'];
    const networkTools = ['fetch'];

    if (readTools.includes(toolName)) return 'read';
    if (writeTools.includes(toolName)) return 'write';
    if (commandTools.includes(toolName)) return 'command';
    if (networkTools.includes(toolName)) return 'network';

    return 'write'; // Default to write for safety
  }

  getToolsPrompt() {
    const availableTools = `
  ${Object.entries(this.tools)
    .map(([key, tool]) => {
      const tool2 = tool as FunctionTool;
      return `
<tool>
<name>${key}</name>
<description>${tool2.description}</description>
<input_json_schema>${JSON.stringify(tool2.parameters)}</input_json_schema>
</tool>
  `.trim();
    })
    .join('\n')}
  `;
    return `
# TOOLS

You only have access to the tools provided below. You can only use one tool per message, and will receive the result of that tool use in the user's response. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use.

## Tool Use Formatting

**CRITICAL: Always close all XML tags properly.**
**CRITICAL: Ensure valid JSON in arguments with proper escaping.**

Tool use is formatted using XML-style tags. The tool use is enclosed in <use_tool></use_tool> and Parameters are enclosed within <arguments></arguments> tags as valid JSON.

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

**Before submitting: Double-check that every < has a matching > and every <tag> has a </tag>**

## Available Tools

${availableTools}
    `;
  }
}
