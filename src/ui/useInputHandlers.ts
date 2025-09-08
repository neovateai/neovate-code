import { useCallback } from 'react';
import { ERROR_MESSAGES } from './constants';
import { useAppStore } from './store';
import { useFileSuggestion } from './useFileSuggestion';
import { useImagePaste } from './useImagePaste';
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
  const fileSuggestion = useFileSuggestion(inputState.state);
  const pasteManager = usePasteManager();
  const imageManager = useImagePaste();

  const handleSubmit = useCallback(async () => {
    const value = inputState.state.value.trim();
    if (value === '') return;

    // Handle all pasted text replacements before submission
    let finalValue = pasteManager.processFinalValue(value);
    // Handle image placeholder replacement - remove placeholders from text but keep image data
    finalValue = imageManager.replaceImagePlaceholders(finalValue);

    // 1. slash command
    if (slashCommands.suggestions.length > 0) {
      const completedCommand = slashCommands.getCompletedCommand();
      inputState.reset();
      pasteManager.clearPastedText();
      imageManager.clearImages();
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
    // 3. submit
    inputState.setValue('');
    pasteManager.clearPastedText();
    const imageData = imageManager.getImageData();
    imageManager.clearImages();
    // TODO: Update send function to support image data
    // For now, send only the final text value
    await send(finalValue);
  }, [
    inputState,
    send,
    slashCommands,
    fileSuggestion,
    pasteManager,
    imageManager,
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
    [slashCommands],
  );

  const handleChange = useCallback(
    (val: string) => {
      setHistoryIndex(null);
      inputState.setValue(val);
      // Sync image state
      if (imageManager.pastedImages.length > 0) {
        imageManager.updateImagesFromValue(val);
      }
    },
    [inputState, setHistoryIndex, imageManager],
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
      pasteManager.clearPastedText();
      imageManager.clearImages();
    }
  }, [
    inputState,
    history,
    historyIndex,
    setDraftInput,
    slashCommands,
    pasteManager,
    imageManager,
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
      pasteManager.clearPastedText();
      imageManager.clearImages();
    }
  }, [
    inputState,
    history,
    historyIndex,
    draftInput,
    setHistoryIndex,
    slashCommands,
    pasteManager,
    imageManager,
  ]);

  const handleHistoryReset = useCallback(() => {
    setHistoryIndex(null);
  }, [setHistoryIndex]);

  const handleTextPaste = useCallback(
    async (rawText: string) => {
      const result = await pasteManager.handleTextPaste(rawText);
      if (!result.success) {
        inputState.setError(result.error || ERROR_MESSAGES.PASTE_FAILED);
        return;
      }

      log(`Text paste successful: ${result.pasteId}`);

      if (result.pasteId && result.prompt) {
        const currentCursorPos =
          inputState.state.cursorPosition ?? inputState.state.value.length;
        const newValue =
          inputState.state.value.slice(0, currentCursorPos) +
          result.prompt +
          inputState.state.value.slice(currentCursorPos);

        inputState.setValue(newValue);
        inputState.setCursorPosition(currentCursorPos + result.prompt.length);
      }
    },
    [pasteManager, inputState],
  );

  const handleImagePaste = useCallback(
    (image: string) => {
      const placeholder = imageManager.handleImagePaste(image);
      if (placeholder) {
        const currentCursorPos =
          inputState.state.cursorPosition ?? inputState.state.value.length;
        const newValue =
          inputState.state.value.slice(0, currentCursorPos) +
          placeholder +
          inputState.state.value.slice(currentCursorPos);
        inputState.setValue(newValue);
        inputState.setCursorPosition(currentCursorPos + placeholder.length);
      }
    },
    [imageManager, inputState],
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
      handleTextPaste,
      handleImagePaste,
    },
    slashCommands,
    fileSuggestion,
    pasteManager,
    imageManager,
  };
}
