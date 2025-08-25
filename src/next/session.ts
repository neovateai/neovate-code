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
    this.history = opts.history || new History([]);
  }
  updateHistory(history: History) {
    this.history = history;
  }
  static create() {
    return new Session({
      id: randomUUID(),
    });
  }
}
