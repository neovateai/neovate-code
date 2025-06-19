import { execFile } from 'child_process';
import path from 'path';
import { findActualExecutable } from 'spawn-rx';
import { fileURLToPath, resolve } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '../');

function ripgrepPath() {
  const { cmd } = findActualExecutable('rg', []);
  if (cmd !== 'rg') {
    return cmd;
  } else {
    const rgRoot = path.resolve(__dirname, 'vendor', 'ripgrep');
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
          resolve([]);
        } else {
          resolve(stdout.trim().split('\n').filter(Boolean));
        }
      },
    );
  });
}
