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
import { logTool } from './logger';
import pc from 'picocolors';

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
          logTool(`Tool ${pc.bold(key)} called with args: ${JSON.stringify(args)}`);
          return tool.execute!(args, options);
        },
      };
      return [key, newTool];
    }),
  );
};
