import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from './store';
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
  const slashCommands = useSlashCommands(inputState.state.value);
  const [forceTabTrigger, setForceTabTrigger] = useState(false);
  const fileSuggestion = useFileSuggestion(inputState.state, forceTabTrigger);
  const pasteManager = usePasteManager();
  const imageManager = useImagePasteManager();

  const resetTabTrigger = useCallback(() => {
    setForceTabTrigger(false);
  }, []);

  const applyFileSuggestion = useCallback(() => {
    const val = inputState.state.value;
    const beforeMatch = val.substring(0, fileSuggestion.startIndex);
    const afterMatch = val
      .substring(fileSuggestion.startIndex + fileSuggestion.fullMatch.length)
      .trim();
    const file = fileSuggestion.getSelected();

    // Add @ prefix only for @ trigger type
    const prefix = fileSuggestion.triggerType === 'at' ? '@' : '';
    const newValue = `${beforeMatch}${prefix}${file} ${afterMatch}`.trim();
    const newCursorPos = `${beforeMatch}${prefix}${file} `.length;

    inputState.setValue(newValue);
    inputState.setCursorPosition(newCursorPos);
    // Reset tab trigger after selection
    resetTabTrigger();
  }, [inputState, fileSuggestion, resetTabTrigger]);

  const canTriggerTabSuggestion = useMemo(
    () =>
      slashCommands.suggestions.length === 0 &&
      fileSuggestion.triggerType !== 'at',
    [slashCommands.suggestions.length, fileSuggestion.triggerType],
  );

  // Auto reset tab trigger when input becomes empty or contains @
  useEffect(() => {
    const value = inputState.state.value;
    if (value.trim() === '' || value.includes('@')) {
      resetTabTrigger();
    }
  }, [inputState.state.value, resetTabTrigger]);

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
      applyFileSuggestion();
      return;
    }
    // 3. submit (pasted text expansion is handled in store.send)
    inputState.setValue('');
    resetTabTrigger();
    await send(value);
  }, [
    inputState,
    send,
    slashCommands,
    fileSuggestion,
    applyFileSuggestion,
    resetTabTrigger,
  ]);

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
      if (fileSuggestion.matchedPaths.length > 0) {
        applyFileSuggestion();
        return;
      }
      // 3. Trigger tab file suggestion
      if (!isShiftTab && inputState.state.value.trim() !== '') {
        // Only trigger tab suggestion if:
        // - not in slash command mode
        // - not in @ file suggestion mode
        // - has content to suggest from
        if (canTriggerTabSuggestion) {
          setForceTabTrigger(true);
          return;
        }
      }
      // 4. switch mode
      if (isShiftTab) {
        togglePlanMode();
      }
    },
    [
      slashCommands,
      fileSuggestion,
      inputState,
      togglePlanMode,
      setForceTabTrigger,
      applyFileSuggestion,
      canTriggerTabSuggestion,
    ],
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
