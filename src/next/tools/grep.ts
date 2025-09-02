import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { ripGrep } from '../../utils/ripgrep';
import { Context } from '../context';
import { createTool } from '../createTool';
import type { GrepToolResult } from './type';

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
    }),
    execute: async ({
      pattern,
      search_path,
      include,
    }): Promise<GrepToolResult> => {
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
        const matches = results
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
        const durationMs = Date.now() - start;
        return {
          success: true,
          message: `Found ${matches.length} files in ${durationMs}ms.`,
          data: {
            filenames: matches,
            durationMs,
            numFiles: matches.length,
          },
        };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
    approval: {
      category: 'read',
    },
  });
}
