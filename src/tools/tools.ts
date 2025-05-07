import { Tool } from 'ai';
import { jsonrepair } from 'jsonrepair';
import { PluginHookType } from '../pluginManager/pluginManager';
import { Context } from '../types';
import { createBashTool } from './BashTool';
import { createBatchTool } from './BatchTool';
import { createFileEditTool } from './FileEditTool';
import { createFileReadTool } from './FileReadTool';
import { createFileWriteTool } from './FileWriteTool';
import { createGlobTool } from './GlobTool';
import { createGrepTool } from './GrepTool';
import { createLSTool } from './LsTool';
import { createThinkTool } from './ThinkTool';
import { createTodoTool } from './TodoTool';
import { createWebFetchTool } from './WebFetchTool';

export const getAllTools = async (opts: { context: Context }) => {
  return {
    FileReadTool: createFileReadTool(opts),
    FileEditTool: createFileEditTool(opts),
    BashTool: createBashTool(opts),
    LSTool: createLSTool(opts),
    FileWriteTool: createFileWriteTool(opts),
    GrepTool: createGrepTool(opts),
    GlobTool: createGlobTool(opts),
    ThinkTool: createThinkTool(opts),
    WebFetchTool: createWebFetchTool(opts),
    BatchTool: createBatchTool(opts),
    ...(opts.context.config.tasks
      ? createTodoTool({ context: opts.context })
      : {}),
  };
};

export const getAskTools = async (opts: { context: Context }) => {
  return {
    FileReadTool: createFileReadTool(opts),
    LSTool: createLSTool(opts),
    GrepTool: createGrepTool(opts),
    GlobTool: createGlobTool(opts),
    ThinkTool: createThinkTool(opts),
    WebFetchTool: createWebFetchTool(opts),
    BatchTool: createBatchTool(opts),
  };
};

export interface ToolContext {
  tools: Record<string, Tool>;
}

export async function callTool(
  tools: Record<string, Tool>,
  toolUse: {
    toolName: string;
    arguments: Record<string, string>;
  },
  queryId: string,
  context: Context,
  timeout?: number,
) {
  const tool = tools[toolUse.toolName];
  if (!tool) {
    throw new Error(
      `Tool ${toolUse.toolName} not found in ${Object.keys(tools).join(', ')}`,
    );
  }

  const start = Date.now();
  // hook: toolStart
  await context.pluginManager.apply({
    hook: 'toolStart',
    args: [{ toolUse, queryId }],
    type: PluginHookType.Series,
    pluginContext: context.pluginContext,
  });
  // TODO: should not use ai sdk's tool interface, but use our own
  // @ts-ignore
  const toolPromise = tool.execute!(toolUse.arguments, {
    tools,
  } as ToolContext);
  timeout ||= 1000 * 60 * 1;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Tool ${toolUse.toolName} execution timed out after ${timeout}ms`,
        ),
      );
    }, timeout);
  });
  const result = await Promise.race([toolPromise, timeoutPromise]);
  const end = Date.now();
  // console.log(`Tool ${toolUse.toolName} execution took ${end - start}ms`);
  // hook: toolEnd
  await context.pluginManager.apply({
    hook: 'toolEnd',
    args: [{ toolUse, startTime: start, endTime: end, queryId }],
    type: PluginHookType.Series,
    pluginContext: context.pluginContext,
  });
  return result;
}

export function parseToolUse(text: string): {
  message: string;
  toolUse: { toolName: string; arguments: Record<string, string> } | null;
} {
  const toolMatch = text.match(/<use_tool>[\s\S]*?<\/use_tool>/);
  const message = toolMatch
    ? text.replace(toolMatch[0], '').trim()
    : text.trim();
  if (!toolMatch) {
    return { message, toolUse: null };
  }
  const tool = toolMatch[0];
  const toolName = tool.match(/<tool_name>(.*?)<\/tool_name>/)?.[1];
  const argsMatch = tool.match(/<arguments>([\s\S]*?)<\/arguments>/)?.[1];
  const args = (() => {
    if (!argsMatch) {
      return {};
    }
    try {
      return JSON.parse(argsMatch.trim());
    } catch (e) {
      return JSON.parse(jsonrepair(argsMatch.trim()));
    }
  })();
  if (!toolName) {
    throw new Error('No tool name found');
  }
  return { message, toolUse: { toolName, arguments: args } };
}
