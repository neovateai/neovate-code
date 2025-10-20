import { message } from 'antd';
import i18n from 'i18next';
import { proxy } from 'valtio';
import type { NodeBridgeResponse } from '@/types/chat';
import type { Config, ProviderConfig } from '@/types/config';
import { state as chatState } from './chat';
import { actions as clientActions } from './client';

interface ConfigState {
  globalConfigDir: string;
  projectConfigDir: string;
  config: Partial<Config>;
  loading: boolean;
}

export const state = proxy<ConfigState>({
  globalConfigDir: '',
  projectConfigDir: '',
  config: {
    language: 'English',
    approvalMode: 'default',
    todo: true,
    autoCompact: true,
    autoUpdate: true,
    browser: false,
  },
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

  async set(key: keyof Config, value: any, isGlobal = false) {
    const { cwd } = chatState;
    state.loading = true;
    const serializedValue =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    const response = (await clientActions.request('config.set', {
      cwd,
      isGlobal,
      key,
      value: serializedValue,
    })) as NodeBridgeResponse;

    if (!response.success) {
      message.error(response.message || i18n.t('settings.updateError'));
      state.loading = false;
      return false;
    }

    message.success(i18n.t('settings.updateSuccess'));
    await this.getConfig();
    state.loading = false;
    return true;
  },

  async remove(key: keyof Config, isGlobal = false, values?: string[]) {
    const { cwd } = chatState;
    state.loading = true;
    const response = (await clientActions.request('config.remove', {
      cwd,
      isGlobal,
      key,
      values,
    })) as NodeBridgeResponse;
    if (!response.success) {
      message.error(response.message || i18n.t('settings.updateError'));
      state.loading = false;
      return false;
    }
  },
};
