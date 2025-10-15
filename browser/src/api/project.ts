import { request } from '@/utils/request';
import type { ApiResponse } from './model';

interface SessionInfo {
  sessionId: string;
  modified: Date;
  created: Date;
  messageCount: number;
  summary: string;
}

export interface ProjectInfo {
  name: string;
  path: string;
  gitBranch?: string;
  gitStatus?: 'clean' | 'modified' | 'staged' | 'conflicted';
  sessions: SessionInfo[];
}

export const getProjectInfo = (
  folder?: string,
): Promise<ApiResponse<ProjectInfo>> => {
  return request.get('/project/info', { params: { folder } });
};

export const openProjectInEditor = (
  projectPath: string,
): Promise<ApiResponse<any>> => {
  return request.post('/project/open-in-editor', { projectPath });
};
