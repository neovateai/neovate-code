// import { AgentTool } from './tools/AgentTool';
import { Tool } from 'ai';
import pc from 'picocolors';
import { logTool } from './logger';
import { deserializeToolName } from './mcp';
import { bashTool } from './tools/BashTool';
import { fileEditTool } from './tools/FileEditTool/FileEditTool';
import { fileReadTool } from './tools/FileReadTool';
import { fileWriteTool } from './tools/FileWriteTool';
import { globTool } from './tools/GlobTool';
import { grepTool } from './tools/GrepTool';
import { lsTool } from './tools/LsTool';
import { ThinkTool } from './tools/ThinkTool';

export const getAllTools = () => {
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

export const getTools = async () => {
  const tools = getAllTools();
  // TODO: add MCP tools
  const mcpTools = {};
  return {
    ...tools,
    ...mcpTools,
  };
};

export const withLogger = (tools: Record<string, Tool>) => {
  return Object.fromEntries(
    Object.entries(tools).map(([key, tool]) => {
      const newTool = {
        ...tool,
        execute: async (args: any, options: any) => {
          logTool(
            `Tool ${pc.bold(deserializeToolName(key))} called with args: ${JSON.stringify(args)}`,
          );
          return tool.execute!(args, options);
        },
      };
      return [key, newTool];
    }),
  );
};

export async function callTool(
  tools: Record<string, Tool>,
  toolUse: {
    toolName: string;
    arguments: Record<string, string>;
  }
) {
  const tool = tools[toolUse.toolName];
  if (!tool) {
    throw new Error(`Tool ${toolUse.toolName} not found`);
  }
  return tool.execute!(toolUse.arguments, {} as any);
}

/**
e.g.

I'm going to use the ping tool to test the server connection.
<use_tool>
  <tool_name>ping</tool_name>
  <arguments>
    {"message": "test ping"}
  </arguments>
</use_tool>
 */
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
