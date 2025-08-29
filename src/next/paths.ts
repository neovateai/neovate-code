import fs from 'fs';
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

  getLatestSessionId() {
    const jsonlFileTimeStamps = fs
      .readdirSync(this.globalProjectDir)
      .filter((file) => file.endsWith('.jsonl'))
      .map((file) => {
        const stats = fs.statSync(path.join(this.globalProjectDir, file));
        return {
          timestamp: stats.mtime.getTime(),
          sessionId: path.basename(file, '.jsonl'),
        };
      });
    const latestSession = jsonlFileTimeStamps.sort(
      (a, b) => b.timestamp - a.timestamp,
    )[0];
    return latestSession.sessionId;
  }
}
