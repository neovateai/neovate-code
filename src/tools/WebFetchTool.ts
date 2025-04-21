import { tool } from 'ai';
import { z } from 'zod';
import { query } from '../query2';

/**
PROMPT:

- Fetches content from a specified URL and processes it using an AI model
- Takes a URL and a prompt as input
- Fetches the URL content, converts HTML to markdown
- Processes the content with the prompt using a small, fast model
- Returns the model's response about the content
- Use this tool when you need to retrieve and analyze web content

Usage notes:
  - IMPORTANT: If an MCP-provided web fetch tool is available, prefer using that tool instead of this one, as it may have fewer restrictions. All MCP-provided tools start with "mcp__".
  - The URL must be a fully-formed valid URL
  - HTTP URLs will be automatically upgraded to HTTPS
  - For security reasons, the URL's domain must have been provided directly by the user, unless it's on a small pre-approved set of the top few dozen hosts for popular coding resources, like react.dev.
  - The prompt should describe what information you want to extract from the page
  - This tool is read-only and does not modify any files
  - Results may be summarized if the content is very large
  - Includes a self-cleaning 15-minute cache for faster responses when repeatedly accessing the same URL
 */

export const WebFetchTool = tool({
  description: 'Fetch content from url',
  parameters: z.object({
    url: z.string().url().describe('The url to fetch content from'),
    prompt: z.string().describe('The prompt to run on the fetched content'),
  }),
  execute: async ({ url, prompt }) => {
    try {
      // 1) Fetch content from URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
        );
      }
      const content = await response.text();

      // 2) Generate the prompt by replacing placeholders
      const promptTemplate = `
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
        prompt: promptTemplate,
        model: 'Grok/grok-3-fast-beta',
        systemPrompt: [],
        context: {},
        tools: {},
      });

      // 3) Return the result
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error(`[WebFetchTool] Error fetching content:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        url,
      };
    }
  },
});
