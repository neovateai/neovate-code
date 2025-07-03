import { Agent, Runner, tool } from '@openai/agents';
import TurndownService from 'turndown';
import { z } from 'zod';
import { Context } from '../context';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5min
const urlCache = new Map();
const MAX_CONTENT_LENGTH = 15000; // 15k

export function createFetchTool(opts: { context: Context }) {
  return tool({
    name: 'fetch',
    description: `
Fetch content from url.
Remembers:
- IMPORTANT: If an MCP-provided web fetch tool is available, prefer using that tool instead of this one, as it may have fewer restrictions. All MCP-provided tools start with "mcp__"
    `.trim(),
    parameters: z.object({
      url: z.string().describe('The url to fetch content from'),
      prompt: z.string().describe('The prompt to run on the fetched content'),
    }),
    execute: async ({ url, prompt }) => {
      try {
        const startTime = Date.now();
        const key = `${url}-${prompt}`;
        const cached = urlCache.get(key);
        if (cached && cached.durationMs < CACHE_TTL_MS) {
          return {
            success: true,
            message: `Successfully fetched content from ${url} (cached)`,
            data: {
              ...cached,
              cached: true,
              durationMs: Date.now() - startTime,
            },
          };
        }

        try {
          new URL(url);
        } catch (e) {
          throw new Error('Invalid URL');
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
          );
        }
        const rawText = await response.text();
        const contentType = response.headers.get('content-type') ?? '';
        const bytes = Buffer.byteLength(rawText, 'utf-8');

        let content;
        if (contentType.includes('text/html')) {
          content = new TurndownService().turndown(rawText);
        } else {
          content = rawText;
        }

        if (content.length > MAX_CONTENT_LENGTH) {
          content =
            content.substring(0, MAX_CONTENT_LENGTH) + '...[content truncated]';
        }

        const agent = new Agent({
          name: 'content-summarizer',
          model: opts.context.config.smallModel,
        });
        const runner = new Runner({
          modelProvider: opts.context.getModelProvider(),
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
        const llmResult = result.finalOutput;

        const code = response.status;
        const codeText = response.statusText;
        const data = {
          result: llmResult,
          code,
          codeText,
          url,
          bytes,
          contentType,
          durationMs: Date.now() - startTime,
        };
        urlCache.set(key, data);
        return {
          success: true,
          message: `Successfully fetched content from ${url}`,
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
