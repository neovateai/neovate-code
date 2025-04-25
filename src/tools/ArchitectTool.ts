import { tool } from 'ai';
import { z } from 'zod';
import { query } from '../llm/query';
import { Context } from '../types';

const ARCHITECT_SYSTEM_PROMPT = `
You are an expert software architect. Your role is to analyze technical requirements and produce clear, actionable implementation plans.
These plans will then be carried out by a junior software engineer so you need to be specific and detailed. However do not actually write the code, just explain the plan.

Follow these steps for each request:
1. Carefully analyze requirements to identify core functionality and constraints
2. Define clear technical approach with specific technologies and patterns
3. Break down implementation into concrete, actionable steps at the appropriate level of abstraction

Keep responses focused, specific and actionable.

IMPORTANT: Do not ask the user if you should implement the changes at the end. Just provide the plan as described above.
IMPORTANT: Do not attempt to write the code or use any string modification tools. Just provide the plan
`.trim();

export function createArchitectTool(opts: { context: Context }) {
  return tool({
    description:
      'Your go-to tool for any technical or coding task. Analyzes requirements and breaks them down into clear, actionable implementation steps. Use this whenever you need help planning how to implement a feature, solve a technical problem, or structure your code.',
    parameters: z.object({
      prompt: z
        .string()
        .describe('The technical request or coding task to analyze'),
      context: z
        .string()
        .optional()
        .describe(
          'Optional context from previous conversation or system state',
        ),
    }),
    execute: async ({ prompt, context }) => {
      console.log(`[ArchitectTool] prompt: ${prompt}, context: ${context}`);
      const content = context
        ? `<context>${context}</context>\n\n${prompt}`
        : prompt;
      // @ts-ignore
      const result = await query({
        model: 'Doubao/ep-20250210151255-r5x5s',
        prompt: content,
        // TODO: add context
        systemPrompt: [ARCHITECT_SYSTEM_PROMPT],
        queryContext: {},
      });
      console.log(`[ArchitectTool] result: ${result}`);
      return result;
    },
  });
}
