import { proxy } from 'valtio';

interface HomepageState {
  sidebarCollapsed: boolean;
}

export const state = proxy<HomepageState>({
  sidebarCollapsed: false,
});

export const actions = {
  toggleSidebar: () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
  },
  setSidebarCollapsed: (collapsed: boolean) => {
    state.sidebarCollapsed = collapsed;
  },
};
