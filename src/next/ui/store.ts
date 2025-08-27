import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { UIBridge } from '../uiBridge';

interface AppState {
  uiBridge: UIBridge | null;
  models: string[];
}

interface AppActions {
  setUIBridge: (bridge: UIBridge) => void;
  setModels: (models: string[]) => void;
  fetchModels: () => Promise<void>;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      // State
      uiBridge: null,
      models: [],

      // Actions
      setUIBridge: (bridge: UIBridge) => {
        set({ uiBridge: bridge });
        get().fetchModels();
      },

      setModels: (models: string[]) => {
        set({ models });
      },

      fetchModels: async () => {
        const { uiBridge } = get();
        if (!uiBridge) return;
        try {
          const response = await uiBridge.request('list_models', {});
          if (response?.models) {
            get().setModels(response.models);
          }
        } catch (error) {
          console.error('Failed to fetch models:', error);
        }
      },
    }),
    { name: 'app-store' },
  ),
);
