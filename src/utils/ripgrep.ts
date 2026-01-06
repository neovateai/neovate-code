import { execFile } from 'child_process';
import createDebug from 'debug';
import path from 'pathe';
import { findActualExecutable } from 'spawn-rx';
import { fileURLToPath } from 'url';
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

function ripgrepPath() {
  const { cmd } = findActualExecutable('rg', []);
  if (cmd !== 'rg') {
    return cmd;
  } else {
    const rgRoot = path.resolve(rootDir, 'vendor', 'ripgrep');
    if (process.platform === 'win32') {
      return path.resolve(rgRoot, 'x64-win32', 'rg.exe');
    } else {
      return path.resolve(rgRoot, `${process.arch}-${process.platform}`, 'rg');
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
