import { tool } from 'ai';
import { z } from 'zod';
import { Context } from '../types';

// import { getModel } from '../model';
// import { query } from '../query';
// import { getAllTools } from '../tools';

// const getAgentTools = async () => {
//   const tools = await getTools();
//   // No recursive agents
//   return Object.fromEntries(
//     Object.entries(tools).filter(([_key, tool]) => tool !== AgentTool),
//   );
// };

export function createAgentTool(opts: { context: Context }) {
  return tool({
    description: `
  AgentTool

  - Use this tool when you need to perform an open ended search that may require multiple rounds of globbing and grepping
  - When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Agent tool instead
  `,
    parameters: z.object({
      prompt: z.string().describe('The task for agent to perform'),
    }),
    execute: async ({ prompt }) => {
      throw new Error('Not implemented');
      // const start = Date.now();
      // const result = await query({
      //   messages: [
      //     { role: 'user', content: prompt },
      //   ],
      //   systemPrompt: [],
      //   context: {},
      //   model: getModel('Doubao/deepseek-chat'),
      //   tools: await getAgentTools(),
      // });
    },
  });
}
