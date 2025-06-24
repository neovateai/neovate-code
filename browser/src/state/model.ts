import { proxy } from 'valtio';
import type { Model } from '@/types/model';
import { MOCK_MODELS } from '@/types/model';

interface ModelState {
  currentModel: Model | null;
  models: Model[];
  isModelSelectorVisible: boolean;
  isAddModelModalVisible: boolean;
}

export const state = proxy<ModelState>({
  currentModel: MOCK_MODELS[0],
  models: MOCK_MODELS,
  isModelSelectorVisible: false,
  isAddModelModalVisible: false,
});

export const actions = {
  setCurrentModel: (model: Model) => {
    state.currentModel = model;
  },
  hideModelSelector: () => {
    state.isModelSelectorVisible = false;
  },
  showModelSelector: () => {
    state.isModelSelectorVisible = true;
  },
  setModels: (models: Model[]) => {
    state.models = models;
  },
  addModel: (model: Model) => {
    state.models = [...state.models, model];
  },
  showAddModelModal: () => {
    state.isAddModelModalVisible = true;
  },
  hideAddModelModal: () => {
    state.isAddModelModalVisible = false;
  },
};
