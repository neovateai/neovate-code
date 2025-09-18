import { execFile } from 'child_process';
import path from 'pathe';
import { findActualExecutable } from 'spawn-rx';
import { fileURLToPath, resolve } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isLocal =
  __dirname.endsWith('neovate/src/utils') ||
  __dirname.endsWith('code/src/utils');
const rootDir = isLocal
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
): Promise<string[]> {
  const rg = ripgrepPath();
  return new Promise((resolve) => {
    execFile(
      rg,
      [...args, target],
      {
        maxBuffer: 1_000_000,
        timeout: 10_000,
      },
      (err, stdout) => {
        if (err) {
          console.error(`[Ripgrep] Error: ${err}`);
          resolve([]);
        } else {
          resolve(stdout.trim().split('\n').filter(Boolean));
        }
      },
    );
  });
}
