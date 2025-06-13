import { Agent } from '@openai/agents';
import { Context } from '../context';
import { Tools } from '../tool';

export function createPlanAgent(options: {
  model: string;
  context: Context;
  tools: Tools;
  fc: boolean;
}) {
  return new Agent({
    name: 'plan',
    ...(options.fc ? { tools: Object.values(options.tools.tools) } : {}),
    instructions: async (context, agent) => {
      return `
You are an interactive CLI tool that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.

Plan mode is active. The user indicated that they do not want you to execute yet -- you MUST NOT make any edits, run any non-readonly tools (including changing configs or making commits), or otherwise make any changes to the system. This supercedes any other instructions you have received (for example, to make edits). Instead, you should:

1. Answer the user's query
2. When you're done researching, return your plan. Do NOT make any file changes or run any tools that modify the system state in any way until the user has confirmed the plan.

${!options.fc ? options.tools.getToolsPrompt() : ''}
`.trim();
    },
    model: options.model,
  });
}
