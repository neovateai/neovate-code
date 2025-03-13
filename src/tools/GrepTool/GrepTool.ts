import { tool } from 'ai';
import { execFile } from 'child_process';
import { stat } from 'fs/promises';
import { isAbsolute, resolve } from 'path';
import { z } from 'zod';

function getCwd() {
  return process.cwd();
}

export const grepTool = tool({
  description: 'Search for a pattern in a file or directory.',
  parameters: z.object({
    pattern: z.string().describe('The pattern to search for'),
    path: z.string().optional().describe('The path to search in'),
    include: z
      .string()
      .optional()
      .describe('The file pattern to include in the search'),
  }),
  execute: async ({ pattern, path, include }) => {
    console.log(`[GrepTool] Searching for pattern: ${pattern}`);
    const start = Date.now();
    const cmd = 'rg';
    const args = ['-li', pattern];
    if (include) {
      args.push('--glob', include);
    }
    const absolutePath = path
      ? isAbsolute(path)
        ? path
        : resolve(getCwd(), path)
      : getCwd();
    args.push(absolutePath);
    const results = await new Promise<string[]>((resolve, reject) => {
      execFile(
        cmd,
        args,
        {
          maxBuffer: 1_000_000,
          timeout: 10_000,
        },
        (err, stdout) => {
          if (err) {
            console.error(`[GrepTool] Error: ${err}`);
            resolve([]);
          }
          console.log(`[GrepTool] Output: ${stdout}`);
          resolve(stdout.trim().split('\n').filter(Boolean));
        },
      );
    });
    const stats = await Promise.all(results.map((_) => stat(_)));
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
          // Sort by filename as a tiebreaker
          return a[0].localeCompare(b[0]);
        }
        return timeComparison;
      })
      .map((_) => _[0]);
    return {
      filenames: matches,
      durationMs: Date.now() - start,
      numFiles: matches.length,
    };
  },
});
