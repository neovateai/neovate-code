import { AgentTool } from './tools/AgentTool/AgentTool';
import { bashTool } from './tools/BashTool/BashTool';
import { fileEditTool } from './tools/FileEditTool/FileEditTool';
import { fileReadTool } from './tools/FileReadTool/FileReadTool';
import { fileWriteTool } from './tools/FileWriteTool/FileWriteTool';
import { globTool } from './tools/GlobTool/GlobTool';
import { grepTool } from './tools/GrepTool/GrepTool';
import { lsTool } from './tools/LsTool/LsTool';

export const getAllTools = () => {
  return {
    fileRead: fileReadTool,
    fileEdit: fileEditTool,
    bash: bashTool,
    ls: lsTool,
    fileWrite: fileWriteTool,
    grep: grepTool,
    glob: globTool,
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
