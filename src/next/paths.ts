import os from 'os';
import path from 'path';
import { formatPath } from '../ui/utils/path-utils';

export class Paths {
  globalConfigDir: string;
  globalProjectDir: string;
  projectConfigDir: string;

  constructor(opts: { productName: string; cwd: string }) {
    const productName = opts.productName.toLowerCase();
    this.globalConfigDir = path.join(os.homedir(), `.${productName}`);
    this.globalProjectDir = path.join(
      this.globalConfigDir,
      'projects',
      formatPath(opts.cwd),
    );
    this.projectConfigDir = path.join(opts.cwd, `.${productName}`);
  }

  getSessionLogPath(sessionId: string) {
    return path.join(this.globalProjectDir, `${sessionId}.jsonl`);
  }
}
