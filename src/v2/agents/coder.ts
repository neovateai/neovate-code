import { Agent } from '@openai/agents';
import { Context } from '../context';
import { Tools } from '../tool';

export function createCodeAgent(options: {
  model: string;
  context: Context;
  tools: Tools;
}) {
  const codeAgent = new Agent({
    name: 'code',
    instructions: async (context, agent) => {
      return `
You are a code agent.
${options.tools.getToolsPrompt()}
      `.trim();
    },
    model: options.model,
  });
  return codeAgent;
}
