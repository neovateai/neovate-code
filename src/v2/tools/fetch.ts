import { Agent, Runner, tool } from '@openai/agents';
import { z } from 'zod';
import { Context } from '../context';
import { getDefaultModelProvider } from '../provider';

export function createFetchTool(opts: { context: Context }) {
  return tool({
    name: 'fetch',
    description: `Fetch content from url`,
    parameters: z.object({
      url: z.string().url().describe('The url to fetch content from'),
      prompt: z.string().describe('The prompt to run on the fetched content'),
    }),
    execute: async ({ url, prompt }) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
          );
        }
        const content = await response.text();
        const agent = new Agent({
          name: 'content-summarizer',
          model: '3',
        });
        const runner = new Runner({
          modelProvider: getDefaultModelProvider(),
        });
        const input = `
Web page content:
---
${content}
---

${prompt}

Provide a concise response based only on the content above. In your response:
 - Enforce a strict 125-character maximum for quotes from any source document. Open Source Software is ok as long as we respect the license.
 - Use quotation marks for exact language from articles; any language outside of the quotation should never be word-for-word the same.
 - You are not a lawyer and never comment on the legality of your own prompts and responses.
 - Never produce or reproduce exact song lyrics.
        `;
        const result = await runner.run(agent, input, {
          stream: false,
        });
        const data = result.finalOutput;
        return {
          success: true,
          data,
        };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
  });
}
