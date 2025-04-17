// import { AgentTool } from './tools/AgentTool';
import { Tool } from 'ai';
import { BashTool } from './tools/BashTool';
import { BatchTool } from './tools/BatchTool';
import { FileEditTool } from './tools/FileEditTool/FileEditTool';
import { FileReadTool } from './tools/FileReadTool';
import { FileWriteTool } from './tools/FileWriteTool';
import { GlobTool } from './tools/GlobTool';
import { GrepTool } from './tools/GrepTool';
import { LSTool } from './tools/LsTool';
import { ThinkTool } from './tools/ThinkTool';
import { todoReadTool, todoWriteTool } from './tools/TodoTool';
import { WebFetchTool } from './tools/WebFetchTool';
import { jsonrepair } from 'jsonrepair';

export const getTools = async (opts?: { tasks?: boolean }) => {
  const tools = {
    FileReadTool,
    FileEditTool,
    BashTool,
    LSTool,
    FileWriteTool,
    GrepTool,
    GlobTool,
    ThinkTool,
    WebFetchTool,
    BatchTool,
    // AgentTool,
  };

  // Add todo tools if tasks feature is enabled
  if (opts?.tasks) {
    return {
      ...tools,
      todoRead: todoReadTool,
      todoWrite: todoWriteTool,
    };
  }

  return tools;
};

export const getAskTools = async () => {
  return {
    FileReadTool,
    BashTool,
    LSTool,
    GrepTool,
    GlobTool,
    ThinkTool,
    WebFetchTool,
    BatchTool,
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
  timeout?: number,
) {
  const tool = tools[toolUse.toolName];
  if (!tool) {
    throw new Error(`Tool ${toolUse.toolName} not found`);
  }

  // TODO: should not use ai sdk's tool interface, but use our own
  // @ts-ignore
  const toolPromise = tool.execute!(toolUse.arguments, {
    tools,
  } as ToolContext);
  timeout ||= 1000 * 60 * 1;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Tool ${toolUse.toolName} execution timed out after ${timeout}ms`));
    }, timeout);
  });
  return Promise.race([toolPromise, timeoutPromise]);
}

export function parseToolUse(text: string): {
  message: string;
  toolUse: { toolName: string; arguments: Record<string, string> } | null;
} {
  const toolMatch = text.match(/<use_tool>[\s\S]*?<\/use_tool>/);
  const message = toolMatch
    ? text.replace(toolMatch[0], "").trim()
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
    throw new Error("No tool name found");
  }
  return { message, toolUse: { toolName, arguments: args } };
}
