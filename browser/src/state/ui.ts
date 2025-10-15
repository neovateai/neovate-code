import { proxy } from 'valtio';

interface UIState {
  settingsModalOpen: boolean;
  projectSelectModalOpen: boolean;
}

export const uiState = proxy<UIState>({
  settingsModalOpen: false,
  projectSelectModalOpen: false,
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

  openProjectSelectModal: () => {
    uiState.projectSelectModalOpen = true;
  },

  closeProjectSelectModal: () => {
    uiState.projectSelectModalOpen = false;
  },

  toggleProjectSelectModal: () => {
    uiState.projectSelectModalOpen = !uiState.projectSelectModalOpen;
  },
};
