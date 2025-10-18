import type { Message } from '@/types/chat';
import { request } from '@/utils/request';
import type { ApiResponse } from './model';

interface SessionInitializeResponse {
  cwd: string;
  sessionId: string;
  messages: Message[];
  history: string[];
  logFile: string;
}

export const initializeSession = (opts: {
  cwd?: string;
  resume?: string;
  continue?: boolean;
}): Promise<ApiResponse<SessionInitializeResponse>> => {
  return request.post('/session/initialize', { ...opts });
};
