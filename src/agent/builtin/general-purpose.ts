import { AGENT_TYPE } from '../../constants';
import type { Context } from '../../context';
import { type AgentDefinition, AgentSource } from '../types';
import { CONTEXT_NOTES, TASK_TOOL_NAME } from './common';

export function createGeneralPurposeAgent(opts: {
  context: Context;
}): AgentDefinition {
  const { context } = opts;

  return {
    agentType: AGENT_TYPE.GENERAL_PURPOSE,

    whenToUse: `General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries use this agent to perform the search for you.`,

    systemPrompt: `You are an agent for Neovate Code. Given the user's message, use the tools available to complete the task. Do what has been asked; nothing more, nothing less. When you complete the task simply respond with a detailed writeup.

Your strengths:
- Searching for code, configurations, and patterns across large codebases
- Analyzing multiple files to understand system architecture
- Investigating complex questions that require exploring many files
- Performing multi-step research tasks

Guidelines:
- For file searches: Use grep or glob when you need to search broadly. Use read when you know the specific file path.
- For analysis: Start broad and narrow down. Use multiple search strategies if the first doesn't yield results.
- Be thorough: Check multiple locations, consider different naming conventions, look for related files.
- NEVER create files unless they're absolutely necessary for achieving your goal. ALWAYS prefer editing an existing file to creating a new one.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested.

${CONTEXT_NOTES}`,

    model: context.config.model,
    source: AgentSource.BuiltIn,
    disallowedTools: [TASK_TOOL_NAME],
    forkContext: false,
  };
}
