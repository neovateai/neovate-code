import { proxy } from 'valtio';

interface HomepageState {
  sidebarCollapsed: boolean;
  rightPanelExpanded: boolean;
  rightPanelWidthPercent: number;
}

export const state = proxy<HomepageState>({
  sidebarCollapsed: false,
  rightPanelExpanded: false,
  rightPanelWidthPercent: 60,
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
  setRightPanelWidthPercent: (widthPercent: number) => {
    state.rightPanelWidthPercent = Math.max(20, Math.min(80, widthPercent));
  },
};
