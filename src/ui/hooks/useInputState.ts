import { useCallback, useReducer } from 'react';

export interface InputState {
  value: string;
  cursorPosition: number | undefined;
  showExitWarning: boolean;
  ctrlCPressed: boolean;
  error: string | null;
}

type InputAction =
  | { type: 'SET_VALUE'; payload: string }
  | { type: 'SET_CURSOR_POSITION'; payload: number | undefined }
  | { type: 'SHOW_EXIT_WARNING'; payload: boolean }
  | { type: 'SET_CTRL_C_PRESSED'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

const initialState: InputState = {
  value: '',
  cursorPosition: undefined,
  showExitWarning: false,
  ctrlCPressed: false,
  error: null,
};

function inputReducer(state: InputState, action: InputAction): InputState {
  switch (action.type) {
    case 'SET_VALUE':
      return { ...state, value: action.payload };
    case 'SET_CURSOR_POSITION':
      return { ...state, cursorPosition: action.payload };
    case 'SHOW_EXIT_WARNING':
      return { ...state, showExitWarning: action.payload };
    case 'SET_CTRL_C_PRESSED':
      return { ...state, ctrlCPressed: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export function useInputState() {
  const [state, dispatch] = useReducer(inputReducer, initialState);

  const setValue = useCallback((value: string) => {
    dispatch({ type: 'SET_VALUE', payload: value });
  }, []);

  const setCursorPosition = useCallback((position: number | undefined) => {
    dispatch({ type: 'SET_CURSOR_POSITION', payload: position });
  }, []);

  const setShowExitWarning = useCallback((show: boolean) => {
    dispatch({ type: 'SHOW_EXIT_WARNING', payload: show });
  }, []);

  const setCtrlCPressed = useCallback((pressed: boolean) => {
    dispatch({ type: 'SET_CTRL_C_PRESSED', payload: pressed });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

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
