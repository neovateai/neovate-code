import fs from 'fs';
import { randomUUID } from '../utils/randomUUID';
import { History, type NormalizedMessage } from './history';
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
  try {
    const content = fs.readFileSync(opts.logPath, 'utf-8');
    const messages = content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    return filterMessages(messages);
  } catch (e: any) {
    throw new Error(`Failed to read log file: ${opts.logPath}: ${e.message}`);
  }
}
