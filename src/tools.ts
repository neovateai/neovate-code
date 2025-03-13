// import { AgentTool } from './tools/AgentTool';
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
