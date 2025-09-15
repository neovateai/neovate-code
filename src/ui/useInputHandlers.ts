import { useCallback } from 'react';
import { useAppStore } from './store';
import { useBashMode } from './useBashMode';
import { useFileSuggestion } from './useFileSuggestion';
import { useImagePasteManager } from './useImagePasteManager';
import { useInputState } from './useInputState';
import { usePasteManager } from './usePasteManager';
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
    clearQueue,
  } = useAppStore();
  const inputState = useInputState();
  const bashMode = useBashMode();
  const slashCommands = useSlashCommands(inputState.state.value);
  const fileSuggestion = useFileSuggestion(inputState.state);
  const pasteManager = usePasteManager();
  const imageManager = useImagePasteManager();

  const handleSubmit = useCallback(async () => {
    const value = inputState.state.value.trim();
    if (value === '') return;
    // 1. slash command
    if (slashCommands.suggestions.length > 0) {
      const completedCommand = slashCommands.getCompletedCommand();
      inputState.reset();
      await send(completedCommand);
      return;
    }
    // 2. file suggestion
    if (fileSuggestion.matchedPaths.length > 0) {
      const val = inputState.state.value;
      const beforeAt = val.substring(0, fileSuggestion.startIndex);
      const afterAt = val
        .substring(fileSuggestion.startIndex + fileSuggestion.fullMatch.length)
        .trim();
      const file = fileSuggestion.getSelected();
      const newValue = `${beforeAt}@${file} ${afterAt}`.trim();
      inputState.setValue(newValue);
      inputState.setCursorPosition(`${beforeAt}@${file} `.length);
      return;
    }
    // 3. submit (pasted text expansion is handled in store.send)
    const finalValue = bashMode.formatBashCommand(value);
    inputState.setValue('');

    // Reset bash mode after submission
    if (bashMode.bashMode) {
      bashMode.exitBashMode();
    }

    await send(finalValue);
  }, [inputState, send, slashCommands, fileSuggestion, bashMode]);

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
      // TODO: same handling as handleSubmit
      if (fileSuggestion.matchedPaths.length > 0) {
        const val = inputState.state.value;
        const beforeAt = val.substring(0, fileSuggestion.startIndex);
        const afterAt = val
          .substring(
            fileSuggestion.startIndex + fileSuggestion.fullMatch.length,
          )
          .trim();
        const file = fileSuggestion.getSelected();
        const newValue = `${beforeAt}@${file} ${afterAt}`.trim();
        inputState.setValue(newValue);
        inputState.setCursorPosition(`${beforeAt}@${file} `.length);
        return;
      }
      // 3. switch mode
      if (isShiftTab) {
        togglePlanMode();
      }
    },
    [slashCommands, fileSuggestion, inputState, togglePlanMode],
  );

  const handleChange = useCallback(
    (val: string) => {
      setHistoryIndex(null);

      // Handle bash mode auto-detection and switching
      const bashResult = bashMode.handleBashModeInput(val);

      if (bashResult.modeChanged) {
        inputState.setValue(bashResult.processedInput);
      } else {
        inputState.setValue(val);
      }
    },
    [inputState, setHistoryIndex, bashMode],
  );

  const handleHistoryUp = useCallback(() => {
    // 1. auto suggest
    // 1.1 slash command suggestions
    if (slashCommands.suggestions.length > 0) {
      slashCommands.navigatePrevious();
      return;
    }
    // 1.2 file suggestions
    if (fileSuggestion.matchedPaths.length > 0) {
      fileSuggestion.navigatePrevious();
      return;
    }
    // 2. queued message (handled before history)
    const { queuedMessages } = useAppStore.getState();
    if (historyIndex === null && queuedMessages.length > 0) {
      const queuedText = queuedMessages.join('\n');
      clearQueue();
      inputState.setValue(queuedText);
      inputState.setCursorPosition(0);
      return;
    }
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
  }, [
    inputState,
    history,
    historyIndex,
    setDraftInput,
    slashCommands,
    fileSuggestion,
    clearQueue,
    log,
  ]);

  const handleHistoryDown = useCallback(() => {
    // 1. auto suggest
    // 1.1 slash command suggestions
    if (slashCommands.suggestions.length > 0) {
      slashCommands.navigateNext();
      return;
    }
    // 1.2 file suggestions
    if (fileSuggestion.matchedPaths.length > 0) {
      fileSuggestion.navigateNext();
      return;
    }
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
    fileSuggestion,
  ]);

  const handleHistoryReset = useCallback(() => {
    setHistoryIndex(null);
  }, [setHistoryIndex]);

  const handlePaste = useCallback(
    async (text: string) => {
      const result = await pasteManager.handleTextPaste(text);
      if (result.success && result.prompt) {
        return { prompt: result.prompt };
      }
      return {};
    },
    [pasteManager],
  );

  const handleImagePaste = useCallback(
    async (base64Data: string) => {
      const result = await imageManager.handleImagePaste(base64Data);
      if (result.success && result.prompt) {
        return { prompt: result.prompt };
      }
      return {};
    },
    [imageManager],
  );

  return {
    inputState,
    bashMode,
    handlers: {
      handleSubmit,
      handleTabPress,
      handleChange,
      handleHistoryUp,
      handleHistoryDown,
      handleHistoryReset,
      handlePaste,
      handleImagePaste,
    },
    slashCommands,
    fileSuggestion,
    pasteManager,
    imageManager,
  };
}
