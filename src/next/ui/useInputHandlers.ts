import { useCallback } from 'react';
import { useAppStore } from './store';
import { useInputState } from './useInputState';
import { useSlashCommands } from './useSlashCommands';

export function useInputHandlers() {
  const {
    send,
    log,
    historyIndex,
    history,
    draftInput,
    setDraftInput,
    setHistoryIndex,
    togglePlanMode,
  } = useAppStore();
  const inputState = useInputState();
  const slashCommands = useSlashCommands(inputState.state.value);

  const handleSubmit = useCallback(async () => {
    const value = inputState.state.value.trim();
    if (value === '') return;

    // slash command
    if (slashCommands.suggestions.length > 0) {
      const completedCommand = slashCommands.getCompletedCommand();
      inputState.reset();
      await send(completedCommand);
      return;
    }

    // TODO: pasted text
    // TODO: image paste
    inputState.setValue('');
    await send(value);
  }, [inputState, send, slashCommands]);

  const handleTabPress = useCallback(
    (isShiftTab: boolean) => {
      // 1. slash command
      if (slashCommands.suggestions.length > 0 && !isShiftTab) {
        const completedCommand = slashCommands.getCompletedCommand();
        inputState.setValue(completedCommand);
        inputState.setCursorPosition(completedCommand.length);
        return;
      }
      // 2. file suggestions
      // 3. switch mode
      if (isShiftTab) {
        togglePlanMode(true);
      }
    },
    [slashCommands],
  );

  const handleChange = useCallback(
    (val: string) => {
      setHistoryIndex(null);
      inputState.setValue(val);
    },
    [inputState, setHistoryIndex],
  );

  const handleHistoryUp = useCallback(() => {
    // 1. auto suggest
    // 1.1 slash command suggestions
    if (slashCommands.suggestions.length > 0) {
      slashCommands.navigatePrevious();
      return;
    }
    // 1.2 file suggestions
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
  }, [inputState, history, historyIndex, setDraftInput, slashCommands]);

  const handleHistoryDown = useCallback(() => {
    // 1. auto suggest
    // 1.1 slash command suggestions
    if (slashCommands.suggestions.length > 0) {
      slashCommands.navigateNext();
      return;
    }
    // 1.2 file suggestions

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
  }, [
    inputState,
    history,
    historyIndex,
    draftInput,
    setHistoryIndex,
    slashCommands,
  ]);

  const handleHistoryReset = useCallback(() => {
    setHistoryIndex(null);
  }, [setHistoryIndex]);

  return {
    inputState,
    handlers: {
      handleSubmit,
      handleTabPress,
      handleChange,
      handleHistoryUp,
      handleHistoryDown,
      handleHistoryReset,
    },
    slashCommands,
  };
}
