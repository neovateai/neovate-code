import { isZodObject } from '@openai/agents/utils';
import path from 'path';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Context } from './context';
import { resolveModelWithContext } from './model';
import { createBashTool } from './tools/bash';
import { createEditTool } from './tools/edit';
import { createFetchTool } from './tools/fetch';
import { createGlobTool } from './tools/glob';
import { createGrepTool } from './tools/grep';
import { createLSTool } from './tools/ls';
import { createReadTool } from './tools/read';
import { createTodoTool } from './tools/todo';
import { createWriteTool } from './tools/write';

type ResolveToolsOpts = {
  context: Context;
  sessionId: string;
  write?: boolean;
  todo?: boolean;
};

export async function resolveTools(opts: ResolveToolsOpts) {
  const { cwd, productName, paths } = opts.context;
  const sessionId = opts.sessionId;
  const { model } = await resolveModelWithContext(
    opts.context.config.model,
    opts.context,
  );
  const readonlyTools = [
    createReadTool({ cwd, productName }),
    createLSTool({ cwd, productName }),
    createGlobTool({ cwd }),
    createGrepTool({ cwd }),
    createFetchTool({ model }),
  ];
  const writeTools = opts.write
    ? [
        createWriteTool({ cwd }),
        createEditTool({ cwd }),
        createBashTool({ cwd }),
      ]
    : [];
  const todoTools = (() => {
    if (!opts.todo) return [];
    const { todoWriteTool, todoReadTool } = createTodoTool({
      filePath: path.join(paths.globalConfigDir, 'todos', `${sessionId}.json`),
    });
    return [todoReadTool, todoWriteTool];
  })();
  const mcpTools = await getMcpTools(opts.context);
  return [...readonlyTools, ...writeTools, ...todoTools, ...mcpTools];
}

async function getMcpTools(context: Context): Promise<Tool[]> {
  try {
    const mcpManager = context.mcpManager;
    await mcpManager.initAsync();
    return await mcpManager.getAllTools();
  } catch (error) {
    console.warn('Failed to load MCP tools:', error);
    return [];
  }
}

export class Tools {
  tools: Record<string, Tool>;
  constructor(tools: Tool[]) {
    this.tools = tools.reduce(
      (acc, tool) => {
        acc[tool.name] = tool;
        return acc;
      },
      {} as Record<string, Tool>,
    );
  }

  get(toolName: string) {
    return this.tools[toolName];
  }

  length() {
    return Object.keys(this.tools).length;
  }

  async invoke(toolName: string, args: string) {
    const tool = this.tools[toolName];
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolName} not found`,
      };
    }
    // @ts-ignore
    const result = validateToolParams(tool.parameters, args);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid tool parameters: ${result.error}`,
      };
    }
    let argsObj: any;
    try {
      argsObj = JSON.parse(args);
    } catch (error) {
      return {
        success: false,
        error: `Invalid tool parameters: ${error}`,
      };
    }
    return await tool.execute(argsObj);
  }

  getToolsPrompt() {
    const availableTools = `
  ${Object.entries(this.tools)
    .map(([key, tool]) => {
      const schema = isZodObject(tool.parameters)
        ? zodToJsonSchema(tool.parameters)
        : tool.parameters;
      return `
<tool>
<name>${key}</name>
<description>${tool.description}</description>
<input_json_schema>${JSON.stringify(schema)}</input_json_schema>
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

function validateToolParams(schema: z.ZodObject<any>, params: string) {
  try {
    if (isZodObject(schema)) {
      const parsedParams = JSON.parse(params);
      const result = schema.safeParse(parsedParams);
      if (!result.success) {
        return {
          success: false,
          error: `Parameter validation failed: ${result.error.message}`,
        };
      }
      return {
        success: true,
        message: 'Tool parameters validated successfully',
      };
    }
    return {
      success: true,
      message: 'Tool parameters validated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error,
    };
  }
}

export interface Tool<T = any> {
  name: string;
  description: string;
  execute: (params: T) => Promise<any> | any;
  approval?: ToolApprovalInfo;
  parameters: z.ZodSchema<T>;
}

type ApprovalContext = {
  toolName: string;
  params: Record<string, any>;
  approvalMode: string;
  context: any;
};

export type ApprovalCategory = 'read' | 'write' | 'command' | 'network';

type ToolApprovalInfo = {
  needsApproval?: (context: ApprovalContext) => Promise<boolean> | boolean;
  category?: ApprovalCategory;
};

export function createTool<TSchema extends z.ZodTypeAny>(config: {
  name: string;
  description: string;
  parameters: TSchema;
  execute: (params: z.infer<TSchema>) => Promise<any> | any;
  approval?: ToolApprovalInfo;
}): Tool<z.infer<TSchema>> {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    execute: config.execute,
    approval: config.approval,
  };
}
