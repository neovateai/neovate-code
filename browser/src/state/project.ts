import { proxy } from 'valtio';
import {
  type ProjectInfo as BaseProjectInfo,
  getProjectInfo,
} from '@/api/project';

interface ProjectInfo extends BaseProjectInfo {
  gitStatusColor?: string;
}

export interface ProjectState {
  loading: boolean;
  projectInfo: ProjectInfo | null;
}
export const state = proxy<ProjectState>({
  loading: false,
  projectInfo: null,
});

export const actions = {
  async getProjectInfo(folder?: string) {
    state.loading = true;
    try {
      const response = await getProjectInfo(folder);
      state.projectInfo = {
        ...response.data,
        gitStatusColor: getGitStatusColor(response.data.gitStatus),
      };
    } finally {
      state.loading = false;
    }
  },
};

function getGitStatusColor(status?: ProjectInfo['gitStatus']): string {
  switch (status) {
    case 'clean':
      return '#22c55e'; // green
    case 'modified':
      return '#f59e0b'; // yellow
    case 'staged':
      return '#3b82f6'; // blue
    case 'conflicted':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
}
