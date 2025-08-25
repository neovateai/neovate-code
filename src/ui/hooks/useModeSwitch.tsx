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
    const modeDisplays: string[] = [];

    switch (state.currentMode) {
      case 'autoEdit':
        modeDisplays.push('auto edit is on');
        break;
      case 'plan':
        modeDisplays.push('plan mode on');
        break;
    }

    if (state.inputMode === 'bash') {
      modeDisplays.push('bash mode');
    }

    return modeDisplays.join(' | ');
  };

  const switchToBash = () => {
    dispatch({ type: 'SET_INPUT_MODE', payload: 'bash' });
  };

  const switchToPrompt = () => {
    dispatch({ type: 'SET_INPUT_MODE', payload: 'prompt' });
  };

  const toggleInputMode = () => {
    const newMode = state.inputMode === 'prompt' ? 'bash' : 'prompt';
    dispatch({ type: 'SET_INPUT_MODE', payload: newMode });
  };

  return {
    currentMode: state.currentMode,
    inputMode: state.inputMode,
    switchMode,
    switchToBash,
    switchToPrompt,
    toggleInputMode,
    getModeDisplay,
  };
}
