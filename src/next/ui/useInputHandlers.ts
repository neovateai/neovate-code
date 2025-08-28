import { useCallback } from 'react';
import { useInputState } from './useInputState';
import { useAppStore } from './store';

export function useInputHandlers() {
  const { send } = useAppStore();
  const inputState = useInputState();
  const handleSubmit = useCallback(() => {
    const value = inputState.state.value.trim();
    if (value === '') return;
    // TODO: pasted text
    // TODO: image paste
    inputState.setValue('');
    send(value);
  }, [inputState, send]);
  const handleChange = useCallback(
    (val: string) => {
      inputState.setValue(val);
    },
    [inputState],
  );
  return {
    inputState,
    handlers: {
      handleSubmit,
      handleChange,
    },
  };
}
