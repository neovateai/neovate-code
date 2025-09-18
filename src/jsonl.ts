import fs from 'fs';
import path from 'pathe';
import type { NormalizedMessage } from './message';
import { createUserMessage } from './message';

export class JsonlLogger {
  filePath: string;
  lastUuid: string | null = null;
  constructor(opts: { filePath: string }) {
    this.filePath = opts.filePath;
    this.lastUuid = this.getLatestUuid();
  }

  getLatestUuid() {
    if (!fs.existsSync(this.filePath)) {
      return null;
    }
    const file = fs.readFileSync(this.filePath, 'utf8');
    const lines = file.split('\n').filter(Boolean);
    const lastLine = lines[lines.length - 1];
    if (!lastLine) {
      return null;
    }
    const message = JSON.parse(lastLine);
    return message.uuid || null;
  }

  addMessage(opts: { message: NormalizedMessage & { sessionId: string } }) {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const message = opts.message;
    fs.appendFileSync(this.filePath, JSON.stringify(message) + '\n');
    this.lastUuid = message.uuid;
    return message;
  }

  addUserMessage(content: string, sessionId: string) {
    const message = {
      ...createUserMessage(content, this.lastUuid),
      sessionId,
    };
    return this.addMessage({
      message,
    });
  }
}
