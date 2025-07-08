import { useAppContext } from '../AppContext';

export function useModeSwitch() {
  const { state, dispatch, services } = useAppContext();

  const switchMode = () => {
    const currentConfig = services.context.config;
    const currentMode = state.currentMode;

    let nextMode: 'normal' | 'autoEdit' | 'plan';

    if (currentMode === 'normal') {
      // Skip autoEdit if config is already autoEdit or yolo
      if (
        currentConfig.approvalMode === 'autoEdit' ||
        currentConfig.approvalMode === 'yolo'
      ) {
        nextMode = 'plan';
      } else {
        nextMode = 'autoEdit';
      }
    } else if (currentMode === 'autoEdit') {
      nextMode = 'plan';
    } else {
      nextMode = 'normal';
    }

    dispatch({ type: 'SET_CURRENT_MODE', payload: nextMode });
  };

  const getModeDisplay = () => {
    switch (state.currentMode) {
      case 'normal':
        return '';
      case 'autoEdit':
        return 'auto edit is on';
      case 'plan':
        return 'plan mode on';
      default:
        return '';
    }
  };

  return {
    currentMode: state.currentMode,
    switchMode,
    getModeDisplay,
  };
}
