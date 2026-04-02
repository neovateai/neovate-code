import chalk from 'chalk';
import fs from 'fs';
import os from 'os';
import path from 'pathe';
import type { Context } from '../context';

interface RecapStats {
  projects: number;
  sessions: number;
  messages: number;
  linesAdded: number;
  linesDeleted: number;
  toolCalls: Record<string, number>;
  byFileType: Record<string, { added: number; deleted: number }>;
  tokenUsage: {
    prompt: number;
    completion: number;
  };
}

interface RecapOptions {
  project?: boolean;
  year?: number;
  json?: boolean;
}

function countLines(content: string): number {
  if (!content) return 0;
  return content.split('\n').length;
}

function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return ext || 'other';
}

function parseLogFile(
  filePath: string,
  stats: RecapStats,
  year?: number,
): void {
  const fileStats = fs.statSync(filePath);
  if (year && fileStats.mtime.getFullYear() !== year) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      if (entry.type === 'message') {
        stats.messages++;

        if (entry.usage) {
          stats.tokenUsage.prompt += entry.usage.input_tokens || 0;
          stats.tokenUsage.completion += entry.usage.output_tokens || 0;
        }

        if (entry.role === 'assistant' && Array.isArray(entry.content)) {
          for (const part of entry.content) {
            if (part.type === 'tool_use' || part.type === 'tool-call') {
              const toolName = part.name || part.toolName;
              stats.toolCalls[toolName] = (stats.toolCalls[toolName] || 0) + 1;

              if (toolName === 'write' && part.input?.content) {
                const ext = getFileExtension(part.input.file_path || '');
                const added = countLines(part.input.content);
                stats.linesAdded += added;
                if (!stats.byFileType[ext]) {
                  stats.byFileType[ext] = { added: 0, deleted: 0 };
                }
                stats.byFileType[ext].added += added;
              }

              if (toolName === 'edit' && part.input) {
                const ext = getFileExtension(part.input.file_path || '');
                const oldLines = countLines(part.input.old_string || '');
                const newLines = countLines(part.input.new_string || '');
                const added = Math.max(0, newLines - oldLines);
                const deleted = Math.max(0, oldLines - newLines);
                stats.linesAdded += added;
                stats.linesDeleted += deleted;
                if (!stats.byFileType[ext]) {
                  stats.byFileType[ext] = { added: 0, deleted: 0 };
                }
                stats.byFileType[ext].added += added;
                stats.byFileType[ext].deleted += deleted;
              }
            }
          }
        }
      }
    } catch {
      // skip invalid line
    }
  }
}

function collectStats(
  neovateDir: string,
  options: RecapOptions,
  cwd: string,
): RecapStats {
  const stats: RecapStats = {
    projects: 0,
    sessions: 0,
    messages: 0,
    linesAdded: 0,
    linesDeleted: 0,
    toolCalls: {},
    byFileType: {},
    tokenUsage: {
      prompt: 0,
      completion: 0,
    },
  };

  if (!fs.existsSync(neovateDir)) {
    return stats;
  }

  const projects = fs.readdirSync(neovateDir);

  for (const project of projects) {
    const projectDir = path.join(neovateDir, project);
    if (!fs.statSync(projectDir).isDirectory()) continue;

    if (options.project) {
      const cwdFormatted = cwd
        .replace(/^\/+|\/+$/g, '')
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
      if (project !== cwdFormatted) continue;
    }

    stats.projects++;

    const files = fs
      .readdirSync(projectDir)
      .filter((f) => f.endsWith('.jsonl') && !f.includes('requests'));

    for (const file of files) {
      stats.sessions++;
      parseLogFile(path.join(projectDir, file), stats, options.year);
    }
  }

  return stats;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

function printStats(stats: RecapStats, options: RecapOptions): void {
  if (options.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  const yearLabel = options.year ? ` (${options.year})` : '';
  const scopeLabel = options.project ? ' - Current Project' : '';

  console.log('');
  console.log(
    chalk.bold.cyan(`📊 Neovate Code Recap${yearLabel}${scopeLabel}`),
  );
  console.log('');

  console.log(chalk.dim('─'.repeat(40)));
  console.log(`  Projects:  ${chalk.white(stats.projects)}`);
  console.log(`  Sessions:  ${chalk.white(stats.sessions)}`);
  console.log(`  Messages:  ${chalk.white(formatNumber(stats.messages))}`);
  console.log(chalk.dim('─'.repeat(40)));

  console.log('');
  console.log(chalk.bold('Code Changes:'));
  console.log(
    `  Lines added:    ${chalk.green('+' + formatNumber(stats.linesAdded))}`,
  );
  console.log(
    `  Lines deleted:  ${chalk.red('-' + formatNumber(stats.linesDeleted))}`,
  );
  const netChange = stats.linesAdded - stats.linesDeleted;
  const netColor = netChange >= 0 ? chalk.green : chalk.red;
  const netSign = netChange >= 0 ? '+' : '';
  console.log(
    `  Net change:     ${netColor(netSign + formatNumber(netChange))}`,
  );

  console.log('');
  console.log(chalk.bold('Tool Usage:'));
  const sortedTools = Object.entries(stats.toolCalls)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const toolLine = sortedTools
    .map(([name, count]) => `${name}: ${formatNumber(count)}`)
    .join('    ');
  console.log(`  ${toolLine}`);

  if (Object.keys(stats.byFileType).length > 0) {
    console.log('');
    console.log(chalk.bold('By File Type:'));
    const totalLines = stats.linesAdded + stats.linesDeleted;
    const sortedTypes = Object.entries(stats.byFileType)
      .map(([ext, data]) => ({
        ext,
        total: data.added + data.deleted,
        added: data.added,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    for (const { ext, total, added } of sortedTypes) {
      const pct = totalLines > 0 ? ((total / totalLines) * 100).toFixed(0) : 0;
      console.log(
        `  ${ext.padEnd(10)} ${formatNumber(added).padStart(8)} lines (${pct}%)`,
      );
    }
  }

  console.log('');
  console.log(chalk.bold('Token Usage:'));
  console.log(`  Prompt:     ${formatNumber(stats.tokenUsage.prompt)} tokens`);
  console.log(
    `  Completion: ${formatNumber(stats.tokenUsage.completion)} tokens`,
  );
  console.log('');
}

export async function runRecap(
  context: Context,
  options: RecapOptions = {},
): Promise<void> {
  const neovateDir = path.join(os.homedir(), '.neovate', 'projects');
  const stats = collectStats(neovateDir, options, context.cwd);

  if (stats.sessions === 0) {
    console.log(chalk.yellow('No session data found.'));
    return;
  }

  printStats(stats, options);
}
