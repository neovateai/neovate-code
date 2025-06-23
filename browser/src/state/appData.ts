import { proxy } from 'valtio';
import { getAppData } from '@/api/appData';

interface AppDataState {
  productName: string;
  version: string;
  cwd: string;
  config: Record<string, any>;
  loading: boolean;
  loaded: boolean;
}

export const state = proxy<{ appData: AppDataState }>({
  appData: {
    productName: '',
    version: '',
    cwd: '',
    config: {},
    loading: false,
    loaded: false,
  },
});

export const actions = {
  setAppData: (appData: Omit<AppDataState, 'loading' | 'loaded'>) => {
    state.appData = {
      ...appData,
      loading: false,
      loaded: true,
    };
  },
  getAppData: async () => {
    if (state.appData.loading || state.appData.loaded) {
      return;
    }

    state.appData.loading = true;
    try {
      const response = await getAppData();
      actions.setAppData(response.data);
    } catch (error) {
      state.appData.loading = false;
      throw error;
    }
  },
};
