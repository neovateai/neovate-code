import { message } from 'antd';
import { proxy } from 'valtio';
import type { NodeBridgeResponse } from '@/types/chat';
import type { Config, ProviderConfig } from '@/types/config';
import { state as chatState } from './chat';
import { actions as clientActions } from './client';

interface ConfigState {
  globalConfigDir: string;
  projectConfigDir: string;
  config: Config | null;
  loading: boolean;
}

export const state = proxy<ConfigState>({
  globalConfigDir: '',
  projectConfigDir: '',
  config: null,
  loading: false,
});

interface GroupedModel {
  provider: string;
  providerId: string;
  models: {
    name: string;
    modelId: string;
    value: string;
  }[];
}

export const actions = {
  async getConfig() {
    const { cwd } = chatState;
    state.loading = true;
    const response = (await clientActions.request('config.list', {
      cwd,
    })) as NodeBridgeResponse<{
      globalConfigDir: string;
      projectConfigDir: string;
      config: Config;
    }>;
    if (!response.success) {
      message.error(response.message || 'Get config failed');
      state.loading = false;
      return;
    }
    const { globalConfigDir, projectConfigDir, config } = response.data;
    state.globalConfigDir = globalConfigDir;
    state.projectConfigDir = projectConfigDir;
    state.config = config;
    state.loading = false;
  },

  async getProvidersList() {
    const { cwd } = chatState;
    const response = (await clientActions.request('providers.list', {
      cwd,
    })) as NodeBridgeResponse<{
      providers: ProviderConfig[];
    }>;
    return response;
  },

  async getModelsList() {
    const { cwd } = chatState;
    const response = (await clientActions.request('models.list', {
      cwd,
    })) as NodeBridgeResponse<{
      groupedModels: GroupedModel[];
      currentModel: string | null;
      currentModelInfo: {
        providerName: string;
        modelName: string;
        modelId: string;
      } | null;
    }>;
    return response;
  },
};
