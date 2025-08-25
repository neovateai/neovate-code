import { randomUUID } from '../utils/randomUUID';
import { Usage } from './usage';

export type SessionId = string;
export class Session {
  id: SessionId;
  usage: Usage;
  constructor(opts: { id: SessionId }) {
    this.id = opts.id;
    this.usage = Usage.empty();
  }
  static create() {
    return new Session({
      id: randomUUID(),
    });
  }
}
