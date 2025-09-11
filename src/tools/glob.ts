import { glob } from 'glob';
import { z } from 'zod';
import { createTool } from '../tool';
import { safeStringify } from '../utils/safeStringify';

const LIMIT = 100;

export function createGlobTool(opts: { cwd: string }) {
  return createTool({
    name: 'glob',
    description: `
Glob
- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns
`.trim(),
    parameters: z.object({
      pattern: z.string().describe('The glob pattern to match files against'),
      path: z
        .string()
        .optional()
        .nullable()
        .describe('The directory to search in'),
    }),
    getDescription: ({ params }) => {
      if (!params.pattern || typeof params.pattern !== 'string') {
        return 'No pattern provided';
      }
      return params.pattern;
    },
    execute: async ({ pattern, path }) => {
      try {
        const start = Date.now();
        const paths = await glob([pattern], {
          cwd: path ?? opts.cwd,
          nocase: true,
          nodir: true,
          stat: true,
          withFileTypes: true,
        });
        const sortedPaths = paths.sort(
          (a, b) => (a.mtimeMs ?? 0) - (b.mtimeMs ?? 0),
        );
        const truncated = sortedPaths.length > LIMIT;
        const filenames = sortedPaths
          .slice(0, LIMIT)
          .map((path) => path.fullpath());
        const message = truncated
          ? `Found ${filenames.length} files in ${Date.now() - start}ms, truncating to ${LIMIT}.`
          : `Found ${filenames.length} files in ${Date.now() - start}ms.`;
        return {
          returnDisplay: message,
          llmContent: safeStringify({
            filenames,
            durationMs: Date.now() - start,
            numFiles: filenames.length,
            truncated,
          }),
        };
      } catch (e) {
        return {
          isError: true,
          llmContent: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
    approval: {
      category: 'read',
    },
  });
}
