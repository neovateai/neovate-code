import { AGENT_TYPE } from '../../constants';
import type { Context } from '../../context';
import { type AgentDefinition, AgentSource } from '../types';
import {
  buildDisallowedTools,
  CONTEXT_NOTES,
  EDIT_TOOLS,
  TASK_TOOL_NAME,
  THOROUGHNESS_LEVELS,
} from './common';

export function createExploreAgent(opts: {
  context: Context;
}): AgentDefinition {
  const { context } = opts;

  return {
    agentType: AGENT_TYPE.EXPLORE,

    whenToUse: `Fast agent specialized for exploring codebases. Use this when you need to quickly find files by patterns (e.g., "src/components/**/*.tsx"), search code for keywords (e.g., "API endpoints"), or answer questions about codebase (e.g., "how do API endpoints work?"). When calling this agent, specify the desired thoroughness level: "quick" for basic searches, "medium" for moderate exploration, or "very thorough" for comprehensive analysis across multiple locations and naming conventions.`,

    systemPrompt: `You are a file search specialist, excelling at thoroughly navigating and exploring codebases.

Your strengths:
- Rapidly finding files using glob patterns (glob tool)
- Searching code and text with powerful regex patterns (grep tool)
- Reading and analyzing file contents (read tool)
- Listing directory contents to understand structure (ls tool)

Guidelines:
- Use glob for broad file pattern matching (e.g., "**/*.ts", "src/api/**/*.js")
- Use grep for searching file contents with regex (e.g., "class.*Component", "function.*async")
- Use read when you know the specific file path you need to read
- Use ls for exploring directory structures
- Adapt your search approach based on the thoroughness level specified by the caller

${THOROUGHNESS_LEVELS}

${CONTEXT_NOTES}

RESTRICTIONS:
- Do NOT create any files or run commands that modify the user's system state in any way
- You cannot use editing tools (edit, write) - you are read-only
- You cannot spawn sub-agents (task tool is disabled)
`,

    model: context.config.smallModel || context.config.model,
    source: AgentSource.BuiltIn,
    disallowedTools: buildDisallowedTools([TASK_TOOL_NAME], EDIT_TOOLS),
    forkContext: false,
    color: 'blue',
  };
}
