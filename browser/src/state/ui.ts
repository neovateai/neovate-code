import { proxy } from 'valtio';

interface UIState {
  settingsModalOpen: boolean;
}

export const uiState = proxy<UIState>({
  settingsModalOpen: false,
});

export const uiActions = {
  openSettingsModal: () => {
    uiState.settingsModalOpen = true;
  },

  closeSettingsModal: () => {
    uiState.settingsModalOpen = false;
  },

  toggleSettingsModal: () => {
    uiState.settingsModalOpen = !uiState.settingsModalOpen;
  },
};
