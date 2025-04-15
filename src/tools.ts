// import { AgentTool } from './tools/AgentTool';
import { Tool } from 'ai';
import { bashTool } from './tools/BashTool';
import { fileEditTool } from './tools/FileEditTool/FileEditTool';
import { fileReadTool } from './tools/FileReadTool';
import { fileWriteTool } from './tools/FileWriteTool';
import { globTool } from './tools/GlobTool';
import { grepTool } from './tools/GrepTool';
import { lsTool } from './tools/LsTool';
import { ThinkTool } from './tools/ThinkTool';

export const getTools = async () => {
  return {
    fileRead: fileReadTool,
    fileEdit: fileEditTool,
    bash: bashTool,
    ls: lsTool,
    fileWrite: fileWriteTool,
    grep: grepTool,
    glob: globTool,
    think: ThinkTool,
    // agent: AgentTool,
  };
};

export const getAskTools = async () => {
  return {
    fileRead: fileReadTool,
    bash: bashTool,
    ls: lsTool,
    grep: grepTool,
    glob: globTool,
    think: ThinkTool,
  };
};

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

  const toolPromise = tool.execute!(toolUse.arguments, {} as any);
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
  const args = argsMatch ? JSON.parse(argsMatch.trim()) : {};
  if (!toolName) {
    throw new Error("No tool name found");
  }
  return { message, toolUse: { toolName, arguments: args } };
}
