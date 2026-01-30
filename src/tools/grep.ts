import fs from 'fs';
import path from 'pathe';
import { z } from 'zod';
import { countTokens } from 'gpt-tokenizer';
import { TOOL_NAMES } from '../constants';
import { createTool } from '../tool';
import { ripGrep } from '../utils/ripgrep';
import { safeStringify } from '../utils/safeStringify';

const DEFAULT_LIMIT = 1000;
const MAX_CONTENT_LINES = 1000;
const MAX_LINE_LENGTH = 2000;
const MAX_CONTENT_LENGTH = 262144;
const MAX_TOKENS = 25000;

const OUTPUT_MODES = ['content', 'files_with_matches', 'count'] as const;
type OutputMode = (typeof OUTPUT_MODES)[number];

const EXCLUDED_DIRS = ['.git', '.svn', '.hg', '.bzr'];

function buildRipgrepArgs(params: {
  pattern: string;
  include?: string;
  output_mode?: OutputMode;
  before_context?: number;
  after_context?: number;
  context?: number;
  line_numbers?: boolean;
  ignore_case?: boolean;
  type?: string;
  multiline?: boolean;
}): string[] {
  const args: string[] = ['--hidden', '--max-columns', '500'];

  for (const dir of EXCLUDED_DIRS) {
    args.push('--glob', `!${dir}`);
  }

  if (params.multiline) {
    args.push('-U', '--multiline-dotall');
  }

  if (params.ignore_case) {
    args.push('-i');
  }

  const mode = params.output_mode ?? 'files_with_matches';

  if (mode === 'files_with_matches') {
    args.push('-l');
  } else if (mode === 'count') {
    args.push('-c');
  }

  if (mode === 'content') {
    const showLineNumbers = params.line_numbers ?? true;
    if (showLineNumbers) {
      args.push('-n');
    }

    if (params.context !== undefined) {
      args.push('-C', String(params.context));
    } else {
      if (params.before_context !== undefined) {
        args.push('-B', String(params.before_context));
      }
      if (params.after_context !== undefined) {
        args.push('-A', String(params.after_context));
      }
    }
  }

  if (params.pattern.startsWith('-')) {
    args.push('-e', params.pattern);
  } else {
    args.push(params.pattern);
  }

  if (params.type) {
    args.push('--type', params.type);
  }

  if (params.include) {
    const globs = params.include.split(',').map((g) => g.trim());
    for (const glob of globs) {
      if (glob) {
        args.push('--glob', glob);
      }
    }
  }

  return args;
}

function extractFilenamesFromContent(lines: string[]): string[] {
  const filenames = new Set<string>();
  for (const line of lines) {
    const match = line.match(/^(.+?):\d+:/);
    if (match) {
      filenames.add(match[1]);
    }
  }
  return Array.from(filenames);
}

export function createGrepTool(opts: { cwd: string }) {
  return createTool({
    name: TOOL_NAMES.GREP,
    description: `A powerful search tool built on ripgrep.

Usage:
- ALWAYS use ${TOOL_NAMES.GREP} for search tasks. NEVER invoke \`grep\` or \`rg\` as a ${TOOL_NAMES.BASH} command. The ${TOOL_NAMES.GREP} tool has been optimized for correct permissions and access.
- Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")
- Filter files with include parameter (e.g., "*.js", "**/*.tsx") or type parameter (e.g., "js", "py", "rust")
- Output modes: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts
- Use ${TOOL_NAMES.TASK} tool for open-ended searches requiring multiple rounds
- Pattern syntax: Uses ripgrep (not grep) - literal braces need escaping
- Multiline matching: For cross-line patterns, use multiline: true`,
    parameters: z.object({
      pattern: z.string().describe('The pattern to search for'),
      search_path: z.string().optional().describe('The path to search in'),
      include: z
        .string()
        .optional()
        .describe('The file pattern to include in the search'),
      limit: z
        .number()
        .max(DEFAULT_LIMIT)
        .optional()
        .describe(
          `Maximum number of files to return (positive number, default: ${DEFAULT_LIMIT})`,
        ),
      output_mode: z
        .enum(OUTPUT_MODES)
        .optional()
        .describe(
          'Output mode: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts',
        ),
      before_context: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of lines to show before each match (rg -B)'),
      after_context: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of lines to show after each match (rg -A)'),
      context: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
          'Number of lines to show before and after each match (rg -C)',
        ),
      line_numbers: z
        .boolean()
        .optional()
        .describe('Show line numbers (default: true for content mode)'),
      ignore_case: z
        .boolean()
        .optional()
        .describe('Case insensitive search (rg -i)'),
      type: z
        .string()
        .optional()
        .describe('File type filter (e.g., "js", "py", "ts", "rust", "go")'),
      multiline: z
        .boolean()
        .optional()
        .describe(
          'Enable multiline mode (rg -U --multiline-dotall), allows . to match newlines',
        ),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Skip the first N results'),
    }),
    getDescription: ({ params }) => {
      if (!params.pattern || typeof params.pattern !== 'string') {
        return 'No pattern provided';
      }
      return params.pattern;
    },
    execute: async ({
      pattern,
      search_path,
      include,
      limit,
      output_mode,
      before_context,
      after_context,
      context,
      line_numbers,
      ignore_case,
      type,
      multiline,
      offset,
    }) => {
      try {
        if (!pattern) {
          return {
            isError: true,
            llmContent: 'Missing required parameter: pattern',
          };
        }

        const start = Date.now();
        const mode = output_mode ?? 'files_with_matches';

        const args = buildRipgrepArgs({
          pattern,
          include,
          output_mode: mode,
          before_context,
          after_context,
          context,
          line_numbers,
          ignore_case,
          type,
          multiline,
        });

        const absolutePath = search_path
          ? path.isAbsolute(search_path)
            ? search_path
            : path.resolve(opts.cwd, search_path)
          : opts.cwd;

        const result = await ripGrep(args, absolutePath);

        if (!result.success && result.exitCode !== 1) {
          return {
            isError: true,
            llmContent: `Ripgrep error: ${result.stderr}`,
          };
        }

        const durationMs = Date.now() - start;
        const appliedOffset = offset ?? 0;
        const maxResults = limit ?? DEFAULT_LIMIT;

        if (mode === 'content') {
          const allLines = result.lines;
          const totalLinesBeforeTruncation = allLines.length;

          let processedLines = allLines.slice(
            appliedOffset,
            appliedOffset + maxResults,
          );

          let truncated = false;
          let truncationReason = '';

          if (processedLines.length > MAX_CONTENT_LINES) {
            processedLines = processedLines.slice(0, MAX_CONTENT_LINES);
            truncated = true;
            truncationReason = 'lines';
          }

          processedLines = processedLines.map((line) =>
            line.length > MAX_LINE_LENGTH
              ? `${line.substring(0, MAX_LINE_LENGTH)}...`
              : line,
          );

          let content = processedLines.join('\n');
          while (
            content.length > MAX_CONTENT_LENGTH &&
            processedLines.length > 0
          ) {
            processedLines = processedLines.slice(
              0,
              Math.floor(processedLines.length * 0.8),
            );
            content = processedLines.join('\n');
            truncated = true;
            truncationReason = 'length';
          }

          let tokenCount = countTokens(content);
          while (tokenCount > MAX_TOKENS && processedLines.length > 0) {
            processedLines = processedLines.slice(
              0,
              Math.floor(processedLines.length * 0.8),
            );
            content = processedLines.join('\n');
            tokenCount = countTokens(content);
            truncated = true;
            truncationReason = 'tokens';
          }

          const filenames = extractFilenamesFromContent(processedLines);

          const returnDisplay = truncated
            ? `Found ${totalLinesBeforeTruncation} lines, showing ${processedLines.length} (truncated due to ${truncationReason}) in ${filenames.length} files (${durationMs}ms)`
            : `Found ${totalLinesBeforeTruncation} lines in ${filenames.length} files (${durationMs}ms)`;

          return {
            returnDisplay,
            llmContent: safeStringify({
              mode: 'content',
              numFiles: filenames.length,
              filenames,
              content,
              numLines: processedLines.length,
              appliedLimit: maxResults,
              appliedOffset,
              durationMs,
              truncated,
              ...(truncated && {
                totalLinesBeforeTruncation,
                hint: 'Results truncated. Use more specific pattern, add include filter, or use offset parameter.',
              }),
            }),
          };
        }

        if (mode === 'count') {
          let totalMatches = 0;
          const filenames: string[] = [];

          for (const line of result.lines) {
            const colonIndex = line.lastIndexOf(':');
            if (colonIndex > 0) {
              const filename = line.slice(0, colonIndex);
              const count = parseInt(line.slice(colonIndex + 1), 10);
              if (!isNaN(count)) {
                totalMatches += count;
                filenames.push(filename);
              }
            }
          }

          return {
            returnDisplay: `Found ${totalMatches} matches in ${filenames.length} files (${durationMs}ms)`,
            llmContent: safeStringify({
              mode: 'count',
              numFiles: filenames.length,
              filenames: filenames.slice(
                appliedOffset,
                appliedOffset + maxResults,
              ),
              numMatches: totalMatches,
              durationMs,
            }),
          };
        }

        const stats = await Promise.all(
          result.lines.map((f) => {
            try {
              return fs.statSync(f);
            } catch {
              return null;
            }
          }),
        );

        const allMatches = result.lines
          .map((f, i) => [f, stats[i]] as const)
          .filter(([, stat]) => stat !== null)
          .sort((a, b) => {
            if (process.env.NODE_ENV === 'test') {
              return a[0].localeCompare(b[0]);
            }
            const timeComparison = (b[1]?.mtimeMs ?? 0) - (a[1]?.mtimeMs ?? 0);
            if (timeComparison === 0) {
              return a[0].localeCompare(b[0]);
            }
            return timeComparison;
          })
          .map(([f]) => f);

        const totalFiles = allMatches.length;
        const matches = allMatches.slice(
          appliedOffset,
          appliedOffset + maxResults,
        );
        const truncated = totalFiles > matches.length + appliedOffset;

        const returnDisplay = truncated
          ? `Found ${totalFiles} files (showing ${matches.length} of ${totalFiles}) in ${durationMs}ms`
          : `Found ${totalFiles} files in ${durationMs}ms`;

        return {
          returnDisplay,
          llmContent: safeStringify({
            mode: 'files_with_matches',
            filenames: matches,
            durationMs,
            totalFiles,
            returnedFiles: matches.length,
            truncated,
            appliedLimit: maxResults,
            appliedOffset,
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
