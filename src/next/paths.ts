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

  getAllSessions() {
    if (!fs.existsSync(this.globalProjectDir)) {
      return [];
    }
    const jsonlFiles = fs
      .readdirSync(this.globalProjectDir)
      .filter((file) => file.endsWith('.jsonl'))
      .map((file) => {
        const filePath = path.join(this.globalProjectDir, file);
        const stats = fs.statSync(filePath);
        const sessionId = path.basename(file, '.jsonl');

        // Read message count and summary
        let messageCount = 0;
        let summary = '';
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n').filter(Boolean);
          messageCount = lines.length;

          // try to extract first user message as summary
          if (lines.length > 0) {
            try {
              const firstMessage = JSON.parse(lines[0]);
              if (
                firstMessage.role === 'user' &&
                typeof firstMessage.content === 'string'
              ) {
                summary =
                  firstMessage.content.length > 50
                    ? firstMessage.content.slice(0, 50) + '...'
                    : firstMessage.content;
              }
            } catch (e) {}
          }
        } catch (e) {
          // ignore read error, message count is 0
        }

        return {
          sessionId,
          modified: stats.mtime,
          created: stats.birthtime,
          messageCount,
          summary,
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, 50);

    return jsonlFiles;
  }
}
