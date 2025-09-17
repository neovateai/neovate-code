import TurndownService from 'turndown';
import { z } from 'zod';
import type { ModelInfo } from '../model';
import { query } from '../query';
import { createTool } from '../tool';
import { safeStringify } from '../utils/safeStringify';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5min
const urlCache = new Map();
const MAX_CONTENT_LENGTH = 15000; // 15k

export function createFetchTool(opts: { model: ModelInfo }) {
  return createTool({
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
    getDescription: ({ params }) => {
      if (!params.url || typeof params.url !== 'string') {
        return 'No URL provided';
      }
      return params.url;
    },
    execute: async ({ url, prompt }) => {
      try {
        const startTime = Date.now();
        const key = `${url}-${prompt}`;
        const cached = urlCache.get(key);
        if (cached && cached.durationMs < CACHE_TTL_MS) {
          return {
            returnDisplay: `Successfully fetched content from ${url} (cached)`,
            llmContent: safeStringify({
              ...cached,
              cached: true,
              durationMs: Date.now() - startTime,
            }),
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
        const result = await query({
          userPrompt: input,
          model: opts.model,
          systemPrompt: '',
        });
        const llmResult = result.success
          ? result.data.text
          : `Failed to fetch content from ${url}`;

        const code = response.status;
        const codeText = response.statusText;
        const data = {
          result: llmResult!,
          code,
          codeText,
          url,
          bytes,
          contentType,
          durationMs: Date.now() - startTime,
        };
        urlCache.set(key, data);
        return {
          llmContent: safeStringify(data),
          returnDisplay: `Successfully fetched content from ${url}`,
        };
      } catch (e) {
        return {
          isError: true,
          llmContent: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
    approval: {
      category: 'network',
    },
  });
}
