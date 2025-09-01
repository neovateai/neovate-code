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

        // 读取消息数量和摘要
        let messageCount = 0;
        let summary = '';
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n').filter(Boolean);
          messageCount = lines.length;

          // 尝试提取第一条用户消息作为摘要
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
            } catch (e) {
              // 解析失败，保持空摘要
            }
          }
        } catch (e) {
          // 忽略读取错误，消息数为0
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
      .slice(0, 50); // 限制最多50条

    return jsonlFiles;
  }
}
