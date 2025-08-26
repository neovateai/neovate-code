import assert from 'assert';
import fs from 'fs';
import { randomUUID } from '../utils/randomUUID';
import { History } from './history';
import { Usage } from './usage';

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
      id: randomUUID(),
    });
  }
  static resume(opts: { id: SessionId; logPath: string }) {
    assert(fs.existsSync(opts.logPath), `log file not found: ${opts.logPath}`);
    const messages = (() => {
      try {
        const content = fs.readFileSync(opts.logPath, 'utf-8');
        const messages = content
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line))
          .filter((message) => message.type === 'message');
        return messages;
      } catch (e: any) {
        throw new Error(
          `Failed to read log file: ${opts.logPath}: ${e.message}`,
        );
      }
    })();
    const history = new History({
      messages,
    });
    return new Session({
      id: opts.id,
      history,
    });
  }
}
