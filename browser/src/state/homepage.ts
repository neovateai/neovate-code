import { proxy } from 'valtio';

interface HomepageState {
  sidebarCollapsed: boolean;
  rightPanelExpanded: boolean;
}

export const state = proxy<HomepageState>({
  sidebarCollapsed: false,
  rightPanelExpanded: false,
});

export const actions = {
  toggleSidebar: () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
  },
  setSidebarCollapsed: (collapsed: boolean) => {
    state.sidebarCollapsed = collapsed;
  },
  toggleRightPanel: () => {
    state.rightPanelExpanded = !state.rightPanelExpanded;
  },
  setRightPanelExpanded: (expanded: boolean) => {
    state.rightPanelExpanded = expanded;
  },
};
