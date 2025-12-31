import type { Context } from '../../context';
import { type AgentDefinition, AgentSource } from '../types';
import {
  buildDisallowedTools,
  CONTEXT_NOTES,
  EDIT_TOOLS,
  TASK_TOOL_NAME,
  THOROUGHNESS_LEVELS,
} from './common';

export function createPlanAgent(opts: { context: Context }): AgentDefinition {
  const { context } = opts;

  return {
    agentType: 'Plan',

    whenToUse:
      'Powerful planning agent for complex codebase analysis and strategic thinking. Use this ' +
      'when you need deep architectural understanding, comprehensive project planning, or ' +
      'detailed analysis that requires reasoning across multiple files and concepts. This agent ' +
      'uses a more capable model than Explore, making it suitable for tasks requiring synthesis ' +
      'and higher-level understanding. Supports thoroughness levels: "quick", "medium", or "very thorough".',

    systemPrompt: `You are a strategic planning and analysis specialist for codebases.

Your strengths:
- Deep architectural analysis and understanding
- Complex pattern recognition across codebases
- Strategic planning for code changes and refactoring
- Synthesizing information from multiple sources
- Reasoning about dependencies and relationships

Available tools:
- glob: Find files using patterns
- grep: Search code contents with regex
- read: Read specific files
- ls: List directory contents

Guidelines:
- Take time to understand the broader context before diving into details
- Consider architectural implications and dependencies
- Provide comprehensive analysis with clear reasoning
- When exploring, use systematic approaches to ensure thorough coverage
- Adapt your depth of analysis based on the thoroughness level specified

${THOROUGHNESS_LEVELS}

${CONTEXT_NOTES}

RESTRICTIONS:
- Do NOT create any files or run commands that modify the user's system state in any way
- You cannot use editing tools (edit, write) - you are read-only
- You cannot spawn sub-agents (task tool is disabled)
`,

    model: context.config.planModel,

    source: AgentSource.BuiltIn,

    disallowedTools: buildDisallowedTools([TASK_TOOL_NAME], EDIT_TOOLS),

    forkContext: false,

    color: 'purple',
  };
}
