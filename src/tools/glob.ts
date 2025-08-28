import { tool } from '@openai/agents';
import { glob } from 'glob';
import { z } from 'zod';
import { Context } from '../context';
import type { GlobToolResult } from './type';

const LIMIT = 100;

export function createGlobTool(opts: { context: Context }) {
  return tool({
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
    execute: async ({ pattern, path }): Promise<GlobToolResult> => {
      try {
        const start = Date.now();
        const paths = await glob([pattern], {
          cwd: path ?? opts.context.cwd,
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
          success: true,
          message,
          data: {
            filenames,
            durationMs: Date.now() - start,
            numFiles: filenames.length,
            truncated,
          },
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
