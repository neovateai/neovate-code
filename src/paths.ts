import fs from 'fs';
import os from 'os';
import path from 'pathe';
import type { SessionConfig } from './session';

interface ConfigLogEntry {
  type: 'config';
  config: SessionConfig;
}

interface MessageLogEntry {
  type: 'message';
  role: string;
  content: string | any[];
  [key: string]: any;
}

type LogEntry = ConfigLogEntry | MessageLogEntry;

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
    if (path.isAbsolute(sessionId)) {
      return sessionId;
    } else if (sessionId.startsWith('.') || sessionId.endsWith('.jsonl')) {
      return path.join(process.cwd(), sessionId);
    } else {
      return path.join(this.globalProjectDir, `${sessionId}.jsonl`);
    }
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

          // Extract summary: prioritize config.summary, fallback to first user message
          if (lines.length > 0) {
            try {
              const firstEntry: LogEntry = JSON.parse(lines[0]);
              if (firstEntry.type === 'config' && firstEntry.config.summary) {
                summary = firstEntry.config.summary;
              } else {
                summary = extractFirstUserMessageSummary(lines);
              }
            } catch (e) {
              summary = extractFirstUserMessageSummary(lines);
            }
          }
        } catch (e) {
          // ignore read error, message count is 0
        }

        return {
          sessionId,
          modified: stats.mtime,
          created: stats.birthtime,
          messageCount,
          summary: normalizeSummary(summary),
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, 50);

    return jsonlFiles;
  }
}

function normalizeSummary(summary: string): string {
  if (!summary) return '';
  return summary
    .replace(/\r\n|\r|\n/g, ' ') // Replace all line breaks with spaces
    .replace(/\s+/g, ' ') // Merge consecutive whitespace characters into single space
    .trim(); // Remove leading and trailing whitespace
}

function extractFirstUserMessageSummary(lines: string[]): string {
  for (const line of lines) {
    try {
      const entry: LogEntry = JSON.parse(line);
      if (
        entry.type === 'message' &&
        'role' in entry &&
        entry.role === 'user' &&
        typeof entry.content === 'string'
      ) {
        return entry.content.length > 50
          ? entry.content.slice(0, 50) + '...'
          : entry.content;
      }
    } catch (e) {}
  }
  return '';
}

function formatPath(from: string) {
  return from
    .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
    .toLowerCase(); // Ensure consistency across filesystems
}
