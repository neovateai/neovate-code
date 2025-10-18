import { proxy } from 'valtio';
import { getProjectInfo, type ProjectInfo } from '@/api/project';

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
      state.projectInfo = response.data;
    } finally {
      state.loading = false;
    }
  },
};
