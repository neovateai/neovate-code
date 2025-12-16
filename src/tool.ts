import type { LanguageModelV2FunctionTool } from '@ai-sdk/provider';
import path from 'pathe';
import * as z from 'zod';
import type { Context } from './context';
import type { ImagePart, TextPart } from './message';
import { resolveModelWithContext } from './model';
import { createAskUserQuestionTool } from './tools/askUserQuestion';
import {
  createBashOutputTool,
  createBashTool,
  createKillBashTool,
} from './tools/bash';
import { createEditTool } from './tools/edit';
import { createFetchTool } from './tools/fetch';
import { createGlobTool } from './tools/glob';
import { createGrepTool } from './tools/grep';
import { createLSTool } from './tools/ls';
import { createReadTool } from './tools/read';
import { createTodoTool, type TodoItem } from './tools/todo';
import { createWriteTool } from './tools/write';

type ResolveToolsOpts = {
  context: Context;
  sessionId: string;
  write?: boolean;
  todo?: boolean;
  askUserQuestion?: boolean;
};

export async function resolveTools(opts: ResolveToolsOpts) {
  const { cwd, productName, paths } = opts.context;
  const sessionId = opts.sessionId;
  // TODO: use small model for fetch tool
  const model = (
    await resolveModelWithContext(opts.context.config.model, opts.context)
  ).model!;
  const readonlyTools = [
    createReadTool({ cwd, productName }),
    createLSTool({ cwd }),
    createGlobTool({ cwd }),
    createGrepTool({ cwd }),
    createFetchTool({ model }),
  ];
  const askUserQuestionTools = opts.askUserQuestion
    ? [createAskUserQuestionTool()]
    : [];
  const writeTools = opts.write
    ? [
        createWriteTool({ cwd }),
        createEditTool({ cwd }),
        createBashTool({
          cwd,
          backgroundTaskManager: opts.context.backgroundTaskManager,
          messageBus: opts.context.messageBus,
        }),
      ]
    : [];
  const todoTools = (() => {
    if (!opts.todo) return [];
    const { todoWriteTool, todoReadTool } = createTodoTool({
      filePath: path.join(paths.globalConfigDir, 'todos', `${sessionId}.json`),
    });
    return [todoReadTool, todoWriteTool];
  })();
  const backgroundTools = opts.write
    ? [
        createBashOutputTool({
          backgroundTaskManager: opts.context.backgroundTaskManager,
        }),
        createKillBashTool({
          backgroundTaskManager: opts.context.backgroundTaskManager,
        }),
      ]
    : [];
  const mcpTools = await getMcpTools(opts.context);

  const allTools = [
    ...readonlyTools,
    ...askUserQuestionTools,
    ...writeTools,
    ...todoTools,
    ...backgroundTools,
    ...mcpTools,
  ];

  const toolsConfig = opts.context.config.tools;
  if (!toolsConfig || Object.keys(toolsConfig).length === 0) {
    return allTools;
  }

  return allTools.filter((tool) => {
    // Check if the tool is disabled (only explicitly set to false will disable)
    const isDisabled = toolsConfig[tool.name] === false;
    return !isDisabled;
  });
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

  async invoke(toolName: string, args: string): Promise<ToolResult> {
    const tool = this.tools[toolName];
    if (!tool) {
      return {
        llmContent: `Tool ${toolName} not found`,
        isError: true,
      };
    }
    // // @ts-expect-error
    // const result = validateToolParams(tool.parameters, args);
    // if (!result.success) {
    //   return {
    //     llmContent: `Invalid tool parameters: ${result.error}`,
    //     isError: true,
    //   };
    // }
    let argsObj: any;
    try {
      argsObj = JSON.parse(args);
    } catch (error) {
      return {
        llmContent: `Tool parameters parse failed: ${error}`,
        isError: true,
      };
    }
    return await tool.execute(argsObj);
  }

  toLanguageV2Tools(): LanguageModelV2FunctionTool[] {
    return Object.entries(this.tools).map(([key, tool]) => {
      // parameters of mcp tools is not zod object
      const isMCP = key.startsWith('mcp__');
      const schema = isMCP ? tool.parameters : z.toJSONSchema(tool.parameters);
      // some providers have a limit on the description length, so we need to truncate it
      // e.g. megallm.io has a limit of 1024 characters
      const limit = process.env.TOOL_DESCRIPTION_LIMIT
        ? Math.floor(parseInt(process.env.TOOL_DESCRIPTION_LIMIT, 10))
        : 0;
      const desc =
        limit > 0 && tool.description.length > limit
          ? tool.description.slice(0, limit - 3) + '...'
          : tool.description;
      return {
        type: 'function',
        name: key,
        description: desc,
        inputSchema: schema,
        providerOptions: {},
      };
    });
  }
}

// function validateToolParams(schema: z.ZodObject<any>, params: string) {
//   try {
//     if (isZodObject(schema)) {
//       const parsedParams = JSON.parse(params);
//       const result = schema.safeParse(parsedParams);
//       if (!result.success) {
//         return {
//           success: false,
//           error: `Parameter validation failed: ${result.error.message}`,
//         };
//       }
//       return {
//         success: true,
//         message: 'Tool parameters validated successfully',
//       };
//     }
//     return {
//       success: true,
//       message: 'Tool parameters validated successfully',
//     };
//   } catch (error) {
//     return {
//       success: false,
//       error: error,
//     };
//   }
// }

export type ToolUse = {
  name: string;
  params: Record<string, any>;
  callId: string;
};

export type ToolUseResult = {
  toolUse: ToolUse;
  result: any;
  approved: boolean;
};

export interface Tool<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  getDescription?: ({
    params,
    cwd,
  }: {
    params: z.output<TSchema>;
    cwd: string;
  }) => string;
  displayName?: string;
  execute: (params: z.output<TSchema>) => Promise<ToolResult> | ToolResult;
  approval?: ToolApprovalInfo;
  parameters: TSchema;
}

type ApprovalContext = {
  toolName: string;
  params: Record<string, any>;
  approvalMode: string;
  context: any;
};

export type ApprovalCategory = 'read' | 'write' | 'command' | 'network' | 'ask';

type ToolApprovalInfo = {
  needsApproval?: (context: ApprovalContext) => Promise<boolean> | boolean;
  category?: ApprovalCategory;
};

type TodoReadReturnDisplay = {
  type: 'todo_read';
  todos: TodoItem[];
};

type TodoWriteReturnDisplay = {
  type: 'todo_write';
  oldTodos: TodoItem[];
  newTodos: TodoItem[];
};

type DiffViewerReturnDisplay = {
  type: 'diff_viewer';
  originalContent: string | { inputKey: string };
  newContent: string | { inputKey: string };
  filePath: string;
  [key: string]: any;
};

export type ReturnDisplay =
  | string
  | DiffViewerReturnDisplay
  | TodoReadReturnDisplay
  | TodoWriteReturnDisplay;

export type ToolResult = {
  llmContent: string | (TextPart | ImagePart)[];
  returnDisplay?: ReturnDisplay;
  isError?: boolean;
};

export function createTool<TSchema extends z.ZodTypeAny>(config: {
  name: string;
  displayName?: string;
  description: string;
  parameters: TSchema;
  execute: (params: z.output<TSchema>) => Promise<ToolResult> | ToolResult;
  approval?: ToolApprovalInfo;
  getDescription?: ({
    params,
    cwd,
  }: {
    params: z.output<TSchema>;
    cwd: string;
  }) => string;
}): Tool<TSchema> {
  return {
    name: config.name,
    displayName: config.displayName,
    description: config.description,
    getDescription: config.getDescription,
    parameters: config.parameters,
    execute: config.execute,
    approval: config.approval,
  };
}

export type ToolParams = Record<string, unknown>;

export type ToolApprovalResult =
  | boolean
  | {
      approved: boolean;
      params?: ToolParams;
    };
