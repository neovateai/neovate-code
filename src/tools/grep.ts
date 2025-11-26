import fs from 'fs';
import path from 'pathe';
import { z } from 'zod';
import { createTool } from '../tool';
import { ripGrep } from '../utils/ripgrep';
import { safeStringify } from '../utils/safeStringify';

const DEFAULT_LIMIT = 1000;

export function createGrepTool(opts: { cwd: string }) {
  return createTool({
    name: 'grep',
    description: `Search for a pattern in a file or directory.`,
    parameters: z.object({
      pattern: z.string().describe('The pattern to search for'),
      search_path: z
        .string()
        .optional()
        .nullable()
        .describe('The path to search in'),
      include: z
        .string()
        .optional()
        .nullable()
        .describe('The file pattern to include in the search'),
      limit: z
        .number()
        .positive()
        .max(DEFAULT_LIMIT)
        .optional()
        .describe(
          `Maximum number of files to return (default: ${DEFAULT_LIMIT})`,
        ),
    }),
    getDescription: ({ params }) => {
      if (!params.pattern || typeof params.pattern !== 'string') {
        return 'No pattern provided';
      }
      return params.pattern;
    },
    execute: async ({ pattern, search_path, include, limit }) => {
      try {
        const start = Date.now();
        const args = ['-li', pattern];
        if (include) {
          args.push('--glob', include);
        }
        const absolutePath = search_path
          ? path.isAbsolute(search_path)
            ? search_path
            : path.resolve(opts.cwd, search_path)
          : opts.cwd;
        const results = await ripGrep(args, absolutePath);
        const stats = await Promise.all(results.map((_) => fs.statSync(_)));
        const allMatches = results
          // Sort by modification time
          .map((_, i) => [_, stats[i]!] as const)
          .sort((a, b) => {
            if (process.env.NODE_ENV === 'test') {
              // In tests, we always want to sort by filename, so that results are deterministic
              return a[0].localeCompare(b[0]);
            }
            const timeComparison = (b[1].mtimeMs ?? 0) - (a[1].mtimeMs ?? 0);
            if (timeComparison === 0) {
              return a[0].localeCompare(b[0]);
            }
            return timeComparison;
          })
          .map((_) => _[0]);

        const maxFiles = limit ?? DEFAULT_LIMIT;
        const totalFiles = allMatches.length;
        const truncated = totalFiles > maxFiles;
        const matches = allMatches.slice(0, maxFiles);
        const returnedFiles = matches.length;
        const durationMs = Date.now() - start;
        const returnDisplay = truncated
          ? `Found ${totalFiles} files (showing first ${returnedFiles} of ${totalFiles} total) in ${durationMs}ms.`
          : `Found ${totalFiles} files in ${durationMs}ms.`;
        return {
          returnDisplay,
          llmContent: safeStringify({
            filenames: matches,
            durationMs,
            totalFiles,
            returnedFiles,
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
