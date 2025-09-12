import { useCallback } from 'react';
import { useAppStore } from './store';

export interface InputState {
  value: string;
  cursorPosition: number | undefined;
  showExitWarning: boolean;
  ctrlCPressed: boolean;
  error: string | null;
}

export function useInputState() {
  const {
    inputValue,
    inputCursorPosition,
    inputShowExitWarning,
    inputCtrlCPressed,
    inputError,
    setInputValue,
    setInputCursorPosition,
    setInputShowExitWarning,
    setInputCtrlCPressed,
    setInputError,
    resetInput,
  } = useAppStore();

  const state: InputState = {
    value: inputValue,
    cursorPosition: inputCursorPosition,
    showExitWarning: inputShowExitWarning,
    ctrlCPressed: inputCtrlCPressed,
    error: inputError,
  };

  const setValue = useCallback(
    (value: string) => {
      setInputValue(value);
    },
    [setInputValue],
  );

  const setCursorPosition = useCallback(
    (position: number | undefined) => {
      setInputCursorPosition(position);
    },
    [setInputCursorPosition],
  );

  const setShowExitWarning = useCallback(
    (show: boolean) => {
      setInputShowExitWarning(show);
    },
    [setInputShowExitWarning],
  );

  const setCtrlCPressed = useCallback(
    (pressed: boolean) => {
      setInputCtrlCPressed(pressed);
    },
    [setInputCtrlCPressed],
  );

  const setError = useCallback(
    (error: string | null) => {
      setInputError(error);
    },
    [setInputError],
  );

  const reset = useCallback(() => {
    resetInput();
  }, [resetInput]);

  return {
    state,
    setValue,
    setCursorPosition,
    setShowExitWarning,
    setCtrlCPressed,
    setError,
    reset,
  };
}
