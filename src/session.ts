import fs from 'fs';
import path from 'pathe';
import type { ApprovalMode } from './config';
import { History } from './history';
import type { NormalizedMessage } from './message';
import { Usage } from './usage';
import { randomUUID } from './utils/randomUUID';

export type SessionId = string;

export class Session {
  id: SessionId;
  usage: Usage;
  history: History;
  constructor(opts: { id: SessionId; history?: History }) {
    this.id = opts.id;
    this.usage = Usage.empty();
    this.history = opts.history || new History({ messages: [] });
  }

  updateHistory(history: History) {
    this.history = history;
  }

  static create() {
    return new Session({
      id: Session.createSessionId(),
    });
  }

  static createSessionId() {
    return randomUUID().slice(0, 8);
  }

  static resume(opts: { id: SessionId; logPath: string }) {
    const messages = loadSessionMessages({ logPath: opts.logPath });
    const history = new History({
      messages,
    });
    return new Session({
      id: opts.id,
      history,
    });
  }
}

export type SessionConfig = {
  approvalMode?: ApprovalMode;
  approvalTools: string[];
  history: string[];
  summary?: string;
  pastedTextMap?: Record<string, string>;
  pastedImageMap?: Record<string, string>;
};

const DEFAULT_SESSION_CONFIG: SessionConfig = {
  approvalMode: 'default',
  approvalTools: [],
  history: [],
  pastedTextMap: {},
  pastedImageMap: {},
};

export class SessionConfigManager {
  logPath: string;
  config: SessionConfig;
  constructor(opts: { logPath: string }) {
    this.logPath = opts.logPath;
    this.config = this.load(opts.logPath);
  }

  load(logPath: string): SessionConfig {
    if (!fs.existsSync(logPath)) {
      return DEFAULT_SESSION_CONFIG;
    }
    try {
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'config') {
            return parsed.config;
          }
        } catch {}
      }
      return DEFAULT_SESSION_CONFIG;
    } catch {
      return DEFAULT_SESSION_CONFIG;
    }
  }
  write() {
    // TODO: add write lock
    const configLine = JSON.stringify({ type: 'config', config: this.config });
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
      fs.writeFileSync(this.logPath, configLine + '\n', 'utf-8');
      return;
    }
    try {
      const content = fs.readFileSync(this.logPath, 'utf-8');
      const lines = content.split('\n');
      const filteredLines = lines.filter((line) => {
        if (!line) return false;
        try {
          const parsed = JSON.parse(line);
          return parsed.type !== 'config';
        } catch {
          return true;
        }
      });
      const newContent = [configLine, ...filteredLines].join('\n');
      fs.writeFileSync(this.logPath, newContent + '\n', 'utf-8');
    } catch (e: any) {
      throw new Error(
        `Failed to write config to log file: ${this.logPath}: ${e.message}`,
      );
    }
  }
}

export function filterMessages(
  messages: NormalizedMessage[],
): NormalizedMessage[] {
  messages = messages.filter((message) => {
    const isMessage = message.type === 'message';
    return isMessage;
  });
  let latestNullParentUuidIndex = -1;
  messages.forEach((message, index) => {
    if (message.parentUuid === null) {
      latestNullParentUuidIndex = index;
    }
  });
  if (latestNullParentUuidIndex !== -1) {
    return messages.slice(latestNullParentUuidIndex);
  } else {
    return [];
  }
}

export function loadSessionMessages(opts: {
  logPath: string;
}): NormalizedMessage[] {
  if (!fs.existsSync(opts.logPath)) {
    return [];
  }
  const content = fs.readFileSync(opts.logPath, 'utf-8');
  const messages = content
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (e: any) {
        throw new Error(
          `Failed to parse line ${index + 1} of log file: ${opts.logPath}: ${
            e.message
          }`,
        );
      }
    });
  return filterMessages(messages);
}
