import { useCallback } from 'react';
import { useAppStore } from './store';
import { useInputState } from './useInputState';

export function useInputHandlers() {
  const {
    send,
    log,
    historyIndex,
    history,
    draftInput,
    setDraftInput,
    setHistoryIndex,
  } = useAppStore();
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

  const handleHistoryUp = useCallback(() => {
    // 1. auto suggest
    // 2. queued message
    // 3. history
    if (history.length > 0) {
      let nextHistoryIndex = null;
      if (historyIndex === null) {
        setDraftInput(inputState.state.value);
        nextHistoryIndex = history.length - 1;
      } else {
        nextHistoryIndex = Math.max(historyIndex - 1, 0);
      }
      const value = history[nextHistoryIndex];
      log('history: ' + JSON.stringify(history));
      log('handleHistoryUp: ' + value + ' ' + nextHistoryIndex);
      inputState.setValue(value);
      inputState.setCursorPosition(0);
      setHistoryIndex(nextHistoryIndex);
    }
  }, [inputState, history, historyIndex, setDraftInput]);

  const handleHistoryDown = useCallback(() => {
    // 1. auto suggest

    // 2. history
    if (historyIndex !== null) {
      let value;
      if (historyIndex === history.length - 1) {
        setHistoryIndex(null);
        value = draftInput;
      } else {
        setHistoryIndex(historyIndex + 1);
        value = history[historyIndex + 1];
      }
      inputState.setValue(value);
      inputState.setCursorPosition(value.length);
    }
  }, [inputState, history, historyIndex, draftInput, setHistoryIndex]);

  const handleHistoryReset = useCallback(() => {
    setHistoryIndex(null);
  }, [setHistoryIndex]);

  return {
    inputState,
    handlers: {
      handleSubmit,
      handleChange,
      handleHistoryUp,
      handleHistoryDown,
      handleHistoryReset,
    },
  };
}
