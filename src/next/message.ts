import { randomUUID } from '../utils/randomUUID';
import type { NormalizedMessage } from './history';

export function createUserMessage(
  content: string,
  parentUuid: string | null,
): NormalizedMessage {
  return {
    role: 'user',
    content,
    type: 'message',
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    parentUuid,
  };
}
