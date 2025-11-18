import fs from 'fs';
import path from 'pathe';
import type { NormalizedMessage } from './message';
import { createUserMessage } from './message';
import type { StreamResult } from './loop';

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

export class RequestLogger {
  globalProjectDir: string;

  constructor(opts: { globalProjectDir: string }) {
    this.globalProjectDir = opts.globalProjectDir;
  }

  private getFilePath(requestId: string): string {
    const requestsDir = path.join(this.globalProjectDir, 'requests');
    if (!fs.existsSync(requestsDir)) {
      fs.mkdirSync(requestsDir, { recursive: true });
    }
    return path.join(requestsDir, `${requestId}.jsonl`);
  }

  logMetadata(opts: {
    requestId: string;
    prompt: StreamResult['prompt'];
    model: StreamResult['model'];
    tools: StreamResult['tools'];
    request?: StreamResult['request'];
    response?: StreamResult['response'];
    error?: StreamResult['error'];
  }) {
    const filePath = this.getFilePath(opts.requestId);
    const entry = {
      type: 'metadata',
      requestId: opts.requestId,
      timestamp: new Date().toISOString(),
      prompt: opts.prompt,
      model: opts.model,
      tools: opts.tools,
      request: opts.request,
      response: opts.response,
      error: opts.error,
    };
    fs.appendFileSync(filePath, JSON.stringify(entry) + '\n');
  }

  logChunk(requestId: string, chunk: any) {
    const filePath = this.getFilePath(requestId);
    const entry = {
      type: 'chunk',
      requestId,
      timestamp: new Date().toISOString(),
      chunk,
    };
    fs.appendFileSync(filePath, JSON.stringify(entry) + '\n');
  }
}
