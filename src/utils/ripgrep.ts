import { execFile, spawn } from 'child_process';
import createDebug from 'debug';
import fs from 'fs';
import path from 'pathe';
import { findActualExecutable } from 'spawn-rx';
import { fileURLToPath } from 'url';
import { matchesAnyPattern, parseProductIgnorePatterns } from './ignore';
import { isLocal } from './isLocal';

const debug = createDebug('neovate:utils:ripgrep');

export interface RipGrepResult {
  success: boolean;
  lines: string[];
  exitCode: number | null;
  stderr: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In local dev (Bun) and test environments, source files are in src/
// In production, compiled files are in dist/
const rootDir =
  isLocal() || process.env.NODE_ENV === 'test'
    ? path.resolve(__dirname, '../../')
    : path.resolve(__dirname, '../');

function ensureExecutable(filePath: string) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
  } catch {
    fs.chmodSync(filePath, 0o755);
  }
}

export function ripgrepPath() {
  const { cmd } = findActualExecutable('rg', []);
  if (cmd !== 'rg') {
    return cmd;
  } else {
    const rgRoot = path.resolve(rootDir, 'vendor', 'ripgrep');
    if (process.platform === 'win32') {
      return path.resolve(rgRoot, 'x64-win32', 'rg.exe');
    } else {
      const rgPath = path.resolve(
        rgRoot,
        `${process.arch}-${process.platform}`,
        'rg',
      );
      ensureExecutable(rgPath);
      return rgPath;
    }
  }
}

export async function ripGrep(
  args: string[],
  target: string,
): Promise<RipGrepResult> {
  const rg = ripgrepPath();
  return new Promise((resolve) => {
    execFile(
      rg,
      [...args, target],
      {
        maxBuffer: 10_000_000,
        timeout: 60_000,
      },
      (err, stdout, stderr) => {
        if (err) {
          const exitCode = 'code' in err ? (err.code as number) : null;
          if (exitCode === 1) {
            resolve({ success: true, lines: [], exitCode: 1, stderr: '' });
          } else {
            debug(`[Ripgrep] Error: ${err}`);
            resolve({
              success: false,
              lines: stdout.trim().split('\n').filter(Boolean),
              exitCode,
              stderr: stderr || String(err),
            });
          }
        } else {
          resolve({
            success: true,
            lines: stdout.trim().split('\n').filter(Boolean),
            exitCode: 0,
            stderr: '',
          });
        }
      },
    );
  });
}

export interface SearchFilesResult {
  success: boolean;
  data: {
    paths: string[];
    truncated: boolean;
  };
}

export async function searchFiles(
  cwd: string,
  query: string,
  maxResults: number = 100,
): Promise<SearchFilesResult> {
  const productPatterns = parseProductIgnorePatterns(cwd, [
    'neovate',
    'takumi',
    'kwaipilot',
  ]);

  const { sep, normalize, relative } = path;
  const rgPath = ripgrepPath();
  let globPatterns: string[];
  if (query.includes(sep) || query.includes('/')) {
    const normalizedQuery = normalize(query).replace(/\\/g, '/');
    globPatterns = [`**/${normalizedQuery}*`, `**/${normalizedQuery}*/**`];
  } else {
    globPatterns = [`**/*${query}*`, `**/*${query}*/**`];
  }
  const args = [
    '--files',
    '--hidden',
    ...globPatterns.flatMap((p) => ['--iglob', p]),
    '--iglob',
    '!**/.git/**',
    '--iglob',
    '!**/node_modules/**',
    cwd,
  ];

  return new Promise((resolve) => {
    const rg = spawn(rgPath, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const matches: string[] = [];
    const lowerQuery = query.toLowerCase();
    let buffer = '';
    let killed = false;

    if (rg.stdout) {
      rg.stdout.on('data', (chunk: Buffer) => {
        if (killed) return;
        buffer += chunk.toString();
        if (buffer.length > 10 * 1024 * 1024) {
          killed = true;
          rg.kill();
          return;
        }
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line || killed) continue;

          if (matches.length >= maxResults) {
            killed = true;
            rg.kill();
            return;
          }

          const relativePath = relative(cwd, line);

          if (matchesAnyPattern(relativePath, productPatterns)) continue;

          matches.push(relativePath);
        }
      });
    }

    rg.on('close', () => {
      const sorted = matches.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aIndex = aLower.indexOf(lowerQuery);
        const bIndex = bLower.indexOf(lowerQuery);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.length - b.length;
      });

      resolve({
        success: true,
        data: {
          paths: sorted.slice(0, maxResults),
          truncated: matches.length >= maxResults,
        },
      });
    });

    rg.on('error', (err) => {
      debug(`[SearchFiles] Error: ${err}`);
      resolve({
        success: true,
        data: { paths: [], truncated: false },
      });
    });
  });
}
