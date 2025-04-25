import { tool } from 'ai';
import { glob } from 'glob';
import { z } from 'zod';
import { Context } from '../types';

const LIMIT = 100;

export function createGlobTool(opts: { context: Context }) {
  return tool({
    description: `
GlobTool

- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns
- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Agent tool instead
  `,
    parameters: z.object({
      pattern: z.string().describe('The glob pattern to match files against'),
      path: z.string().optional().describe('The directory to search in'),
    }),
    execute: async ({ pattern, path }) => {
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
      if (truncated) {
        console.log(
          `[GlobTool] Found ${sortedPaths.length} files, truncating to ${LIMIT}`,
        );
      }
      const filenames = sortedPaths
        .slice(0, LIMIT)
        .map((path) => path.fullpath());
      console.log(
        `[GlobTool] Found ${filenames.length} files in ${Date.now() - start}ms`,
      );
      return {
        filenames,
        durationMs: Date.now() - start,
        numFiles: filenames.length,
        truncated,
      };
    },
  });
}
