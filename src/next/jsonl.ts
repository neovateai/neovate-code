import fs from 'fs';
import path from 'path';
import type { NormalizedMessage } from './history';

export class JsonlLogger {
  filePath: string;
  constructor(opts: { filePath: string }) {
    this.filePath = opts.filePath;
  }

  onMessage(opts: { message: NormalizedMessage }) {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(this.filePath, JSON.stringify(opts.message) + '\n');
    } catch (e) {}
  }
}
