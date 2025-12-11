import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from './store';
import { useFileSuggestion } from './useFileSuggestion';
import { useImagePasteManager } from './useImagePasteManager';
import { useInputState } from './useInputState';
import { useMemoryMode } from './useMemoryMode';
import { usePasteManager } from './usePasteManager';
import { useReverseHistorySearch } from './useReverseHistorySearch';
import { useSlashCommands } from './useSlashCommands';

export type InputMode = 'bash' | 'memory' | 'prompt';

function getInputMode(value: string): InputMode {
  if (value.startsWith('!')) return 'bash';
  if (value.startsWith('#')) return 'memory';
  return 'prompt';
}

export function useInputHandlers() {
  const {
    send,
    log,
    historyIndex,
    history,
    draftInput,
    setDraftInput,
    setHistoryIndex,
    toggleMode,
    clearQueue,
    setBashMode,
  } = useAppStore();

  const inputState = useInputState();
  const mode = getInputMode(inputState.state.value);
  const slashCommands = useSlashCommands(inputState.state.value);
  const [forceTabTrigger, setForceTabTrigger] = useState(false);
  const fileSuggestion = useFileSuggestion(inputState.state, forceTabTrigger);
  const pasteManager = usePasteManager();
  const imageManager = useImagePasteManager();
  const memoryMode = useMemoryMode();

  // Reverse history search state
  const [reverseSearchActive, setReverseSearchActive] = useState(false);
  const reverseSearch = useReverseHistorySearch({
    history,
    active: reverseSearchActive,
  });

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

  useEffect(() => {
    setBashMode(mode === 'bash');
  }, [mode, setBashMode]);

  const selectReverseSearchMatch = useCallback(() => {
    const selectedMatch = reverseSearch.getSelected();
    if (selectedMatch) {
      inputState.setValue(selectedMatch);
      inputState.setCursorPosition(selectedMatch.length);
    }
    setReverseSearchActive(false);
    setHistoryIndex(null);
  }, [reverseSearch, inputState, setHistoryIndex]);

  const handleSubmit = useCallback(async () => {
    // In reverse search mode, select the current match
    if (reverseSearchActive) {
      selectReverseSearchMatch();
      return;
    }

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
    // 3. bash mode - execute command directly
    if (mode === 'bash') {
      const command = value.slice(1).trim();
      inputState.reset();
      await send(`!${command}`);
      return;
    }
    // 4. memory mode - show modal and save to memory
    if (mode === 'memory') {
      const rule = value.slice(1).trim(); // Remove # prefix
      inputState.reset();
      await memoryMode.handleMemorySubmit(rule);
      return;
    }
    // 5. submit (pasted text expansion is handled in store.send)
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
    mode,
    memoryMode,
    reverseSearchActive,
    selectReverseSearchMatch,
  ]);

  const handleTabPress = useCallback(
    (isShiftTab: boolean) => {
      // In reverse search mode, tab acts like enter to select the match
      if (reverseSearchActive) {
        selectReverseSearchMatch();
        return;
      }
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
        toggleMode();
      }
    },
    [
      slashCommands,
      fileSuggestion,
      inputState,
      toggleMode,
      applyFileSuggestion,
      canTriggerTabSuggestion,
      reverseSearchActive,
      selectReverseSearchMatch,
    ],
  );

  const handleChange = useCallback(
    (val: string) => {
      // In reverse search mode, update search query instead
      if (reverseSearchActive) {
        reverseSearch.updateQuery(val);
        return;
      }

      setHistoryIndex(null);
      inputState.setValue(val);
    },
    [inputState, setHistoryIndex, reverseSearchActive, reverseSearch],
  );

  const handleQueuedMessagesUp = useCallback(() => {
    // Disable in reverse search mode
    if (reverseSearchActive) {
      return;
    }
    const { queuedMessages } = useAppStore.getState();
    if (queuedMessages.length === 0) return;
    const queuedText = queuedMessages.join('\n');
    clearQueue();
    inputState.setValue(queuedText);
    inputState.setCursorPosition(0);
  }, [inputState, clearQueue, reverseSearchActive]);

  const handleHistoryUp = useCallback(() => {
    // In reverse search mode, navigate to previous match
    if (reverseSearchActive) {
      reverseSearch.navigatePrevious();
      return;
    }
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
    // 2. history
    if (history.length > 0) {
      let nextHistoryIndex = null;
      if (historyIndex === null) {
        setDraftInput(inputState.state.value);
        nextHistoryIndex = history.length - 1;
      } else {
        nextHistoryIndex = Math.max(historyIndex - 1, 0);
      }
      const value = history[nextHistoryIndex];
      log(`history: ${JSON.stringify(history)}`);
      log(`handleHistoryUp: ${value} ${nextHistoryIndex}`);
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
    log,
    reverseSearchActive,
    reverseSearch,
    setHistoryIndex,
  ]);

  const handleHistoryDown = useCallback(() => {
    // In reverse search mode, navigate to next match
    if (reverseSearchActive) {
      reverseSearch.navigateNext();
      return;
    }
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
      let value: string;
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
    reverseSearchActive,
    reverseSearch,
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

  const handleEscape = useCallback(() => {
    // Exit reverse search mode if active
    if (reverseSearchActive) {
      setReverseSearchActive(false);
      return true; // Indicates search mode exit, don't cancel
    }

    // If in bash or memory mode with only prefix character, switch to prompt mode
    if (
      (mode === 'bash' || mode === 'memory') &&
      inputState.state.value.length === 1
    ) {
      inputState.setValue('');
      return true; // Indicates mode switch, don't cancel
    }
    return false; // Continue with normal cancel behavior
  }, [mode, inputState, reverseSearchActive]);

  const handleReverseSearch = useCallback(() => {
    if (reverseSearchActive) {
      // Already in reverse search mode, cycle to next match
      reverseSearch.navigateNext();
    } else {
      // Enter reverse search mode - clear history index to avoid state conflicts
      setHistoryIndex(null);
      setReverseSearchActive(true);
    }
  }, [reverseSearchActive, reverseSearch, setHistoryIndex]);

  const handleReverseSearchPrevious = useCallback(() => {
    if (reverseSearchActive) {
      reverseSearch.navigatePrevious();
    }
  }, [reverseSearchActive, reverseSearch]);

  return {
    inputState,
    mode,
    handlers: {
      handleSubmit,
      handleTabPress,
      handleChange,
      handleHistoryUp,
      handleQueuedMessagesUp,
      handleHistoryDown,
      handleHistoryReset,
      handlePaste,
      handleImagePaste,
      handleEscape,
      handleReverseSearch,
      handleReverseSearchPrevious,
    },
    slashCommands,
    fileSuggestion,
    pasteManager,
    imageManager,
    reverseSearch: {
      active: reverseSearchActive,
      query: reverseSearch.query,
      matches: reverseSearch.matches,
      selectedIndex: reverseSearch.selectedIndex,
      placeholderText: reverseSearch.placeholderText,
    },
  };
}
