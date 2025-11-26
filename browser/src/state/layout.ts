import { proxy } from 'valtio';

interface LayoutState {
  sidebarCollapsed: boolean;
  rightPanelExpanded: boolean;
  rightPanelWidthPercent: number;
}

export const state = proxy<LayoutState>({
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
    const wasExpanded = state.rightPanelExpanded;
    state.rightPanelExpanded = !state.rightPanelExpanded;

    // Calculate optimal width when first opening the panel
    if (!wasExpanded && state.rightPanelExpanded) {
      const optimalWidth = actions.calculateRightPanelWidth();
      state.rightPanelWidthPercent = optimalWidth;
    }
  },
  setRightPanelExpanded: (expanded: boolean) => {
    state.rightPanelExpanded = expanded;
  },
  setRightPanelWidthPercent: (widthPercent: number) => {
    const maxWidth = actions.calculateRightPanelWidth();
    state.rightPanelWidthPercent = Math.max(
      20,
      Math.min(maxWidth, widthPercent),
    );
  },
  calculateRightPanelWidth: () => {
    const containerWidth = window.innerWidth;
    const inputMaxWidth = 800;
    const inputPadding = 48; // 24px * 2
    const reservedLeftSpace = inputMaxWidth + inputPadding;

    // Right panel width = 100vw - 800px - 48px
    const rightPixels = containerWidth - reservedLeftSpace;
    const rightPercent = (rightPixels / containerWidth) * 100;

    // Ensure minimum width of 20%
    return Math.max(20, rightPercent);
  },
};
