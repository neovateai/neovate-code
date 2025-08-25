import { useCallback, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { getCurrentLineInfo } from '../utils/cursor-utils';
import { useAutoSuggestion } from './useAutoSuggestion';
import { useChatActions } from './useChatActions';
import { extractFileQuery } from './useFileAutoSuggestion';
import { useImagePaste } from './useImagePaste';
import { useInputState } from './useInputState';
import { usePasteManager } from './usePasteManager';

interface UseInputHandlersProps {
  setSlashCommandJSX: (jsx: React.ReactNode) => void;
  onAddToQueue?: (content: string) => void;
}

export function useInputHandlers({
  setSlashCommandJSX,
  onAddToQueue,
}: UseInputHandlersProps) {
  const { state, dispatch } = useAppContext();
  const {
    processUserInput,
    chatInputUp,
    chatInputDown,
    chatInputChange,
    cancelQuery,
  } = useChatActions();
  const inputState = useInputState();
  const pasteManager = usePasteManager();

  const {
    pastedImages,
    handleImagePaste,
    clearImages,
    updateImagesFromValue,
    replaceImagePlaceholders,
    getImageData,
  } = useImagePaste();

  const {
    suggestions,
    selectedIndex,
    isVisible,
    navigateNext,
    navigatePrevious,
    getCompletedCommand,
    setVisible,
    resetVisible,
  } = useAutoSuggestion(inputState.state.value);

  const isProcessing = useMemo(
    () =>
      state.status === 'processing' ||
      state.status === 'tool_approved' ||
      state.status === 'tool_executing',
    [state.status],
  );

  const handleSubmit = useCallback(async () => {
    const { value } = inputState.state;
    if (value.trim() === '') return;

    try {
      // Handle all pasted text replacements before submission
      let finalValue = pasteManager.processFinalValue(value);

      // Handle image placeholder replacement - remove placeholders from text but keep image data
      finalValue = replaceImagePlaceholders(finalValue);

      if (isProcessing && onAddToQueue && pastedImages.length === 0) {
        // If currently processing, add to queue (but not if there are images)
        onAddToQueue(finalValue.trim());
        inputState.setValue('');
        pasteManager.clearPastedText();
        clearImages();
      } else {
        // If idle, or if there are images (images can't be queued), send immediately
        let submissionValue = finalValue;

        // Add bash prefix for history if in bash mode
        if (state.inputMode === 'bash') {
          submissionValue = `!${finalValue}`;
        }

        inputState.setValue('');
        pasteManager.clearPastedText();
        const imageData = getImageData();
        clearImages();

        // Reset to prompt mode after submission
        dispatch({ type: 'SET_INPUT_MODE', payload: 'prompt' });

        await processUserInput(submissionValue, setSlashCommandJSX, imageData);
      }
    } catch (error) {
      inputState.setError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }, [
    inputState,
    pasteManager,
    replaceImagePlaceholders,
    isProcessing,
    onAddToQueue,
    pastedImages.length,
    getImageData,
    clearImages,
    processUserInput,
    setSlashCommandJSX,
    state.inputMode,
    dispatch,
  ]);

  const handleTextPaste = useCallback(
    async (rawText: string) => {
      const result = await pasteManager.handleTextPaste(rawText);

      if (!result.success) {
        inputState.setError(result.error || 'Paste failed');
        return;
      }

      if (result.pasteId) {
        const pastedPrompt =
          pasteManager.pastedTextMap.get(`[Pasted text ${result.pasteId}`) ||
          '';
        if (pastedPrompt) {
          const currentCursorPos =
            inputState.state.cursorPosition ?? inputState.state.value.length;
          const newValue =
            inputState.state.value.slice(0, currentCursorPos) +
            pastedPrompt +
            inputState.state.value.slice(currentCursorPos);

          inputState.setValue(newValue);
          inputState.setCursorPosition(currentCursorPos + pastedPrompt.length);
        }
      }
    },
    [pasteManager, inputState],
  );

  const handleImagePasteWithUI = useCallback(
    (image: string) => {
      const placeholder = handleImagePaste(image);
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
    [handleImagePaste, inputState],
  );

  const handleTabPress = useCallback(
    (isShiftTab: boolean) => {
      if (isVisible) {
        if (isShiftTab) {
          navigatePrevious();
        } else {
          navigateNext();
        }
        const completedCommand = getCompletedCommand();
        inputState.setValue(completedCommand);
        inputState.setCursorPosition(completedCommand.length);
        setVisible(false);
      }
    },
    [
      isVisible,
      navigatePrevious,
      navigateNext,
      getCompletedCommand,
      inputState,
      setVisible,
    ],
  );

  const handleSuggestionAccept = useCallback(() => {
    if (isVisible) {
      const completedCommand = getCompletedCommand();
      const fileQuery = extractFileQuery(inputState.state.value);

      if (fileQuery.hasFileQuery) {
        inputState.setValue(completedCommand);
        inputState.setCursorPosition(completedCommand.length);
        setVisible(false);
      } else {
        inputState.setValue('');
        processUserInput(completedCommand.trim(), setSlashCommandJSX).catch(
          () => {},
        );
      }
    }
  }, [
    isVisible,
    getCompletedCommand,
    inputState,
    setVisible,
    processUserInput,
    setSlashCommandJSX,
  ]);

  const handleHistoryUp = useCallback(() => {
    if (isVisible) {
      navigatePrevious();
    } else {
      // Check for queued messages first
      if (state.queuedMessages.length > 0) {
        const queuedContent = state.queuedMessages
          .map((msg) => msg.content)
          .join('\n');
        inputState.setValue(queuedContent);
        inputState.setCursorPosition(queuedContent.length);
        pasteManager.clearPastedText();
        dispatch({ type: 'CLEAR_QUEUE' });
        return;
      }

      const { value, cursorPosition } = inputState.state;
      const lines = value.split('\n');
      const currentCursorPos = cursorPosition ?? value.length;

      if (lines.length === 1 || !value.trim()) {
        setVisible(false);
        const history = chatInputUp(value);
        inputState.setValue(history);
        inputState.setCursorPosition(history.length);
        pasteManager.clearPastedText();
      } else {
        const { currentLine } = getCurrentLineInfo(value, currentCursorPos);
        if (currentLine === 0) {
          setVisible(false);
          const history = chatInputUp(value);
          inputState.setValue(history);
          inputState.setCursorPosition(history.length);
          pasteManager.clearPastedText();
        }
      }
    }
  }, [
    isVisible,
    navigatePrevious,
    state.queuedMessages,
    inputState,
    pasteManager,
    dispatch,
    setVisible,
    chatInputUp,
  ]);

  const handleHistoryDown = useCallback(() => {
    if (isVisible) {
      navigateNext();
    } else {
      const { value, cursorPosition } = inputState.state;
      const lines = value.split('\n');
      const currentCursorPos = cursorPosition ?? value.length;

      if (lines.length === 1 || !value.trim()) {
        setVisible(false);
        const history = chatInputDown(value);
        inputState.setValue(history);
        inputState.setCursorPosition(history.length);
        pasteManager.clearPastedText();
      } else {
        const { currentLine, lines: textLines } = getCurrentLineInfo(
          value,
          currentCursorPos,
        );
        const lastLine = textLines.length - 1;
        if (currentLine === lastLine) {
          setVisible(false);
          const history = chatInputDown(value);
          inputState.setValue(history);
          inputState.setCursorPosition(history.length);
          pasteManager.clearPastedText();
        }
      }
    }
  }, [
    isVisible,
    navigateNext,
    inputState,
    pasteManager,
    setVisible,
    chatInputDown,
  ]);

  const handleChange = useCallback(
    (val: string) => {
      // Check for bash mode switch
      if (val.startsWith('!') && state.inputMode !== 'bash') {
        // Only switch to bash mode if not already in bash mode
        dispatch({ type: 'SET_INPUT_MODE', payload: 'bash' });
        // Remove the '!' prefix when switching to bash mode
        const bashCommand = val.slice(1);
        chatInputChange(bashCommand);
        inputState.setValue(bashCommand);
      } else if (
        !val.startsWith('!') &&
        state.inputMode === 'bash' &&
        val.trim() === ''
      ) {
        // Only switch back to prompt mode if input is empty (user cleared the bash command)
        dispatch({ type: 'SET_INPUT_MODE', payload: 'prompt' });
        chatInputChange(val);
        inputState.setValue(val);
      } else {
        // Normal input handling
        chatInputChange(val);
        inputState.setValue(val);
      }

      resetVisible();
      if (pastedImages.length > 0) {
        updateImagesFromValue(val);
      }
    },
    [
      chatInputChange,
      inputState,
      resetVisible,
      pastedImages.length,
      updateImagesFromValue,
      state.inputMode,
      dispatch,
    ],
  );

  return {
    inputState,
    pasteManager,
    autoSuggestion: {
      suggestions,
      selectedIndex,
      isVisible,
      resetVisible,
    },
    handlers: {
      handleSubmit,
      handleTextPaste,
      handleImagePasteWithUI,
      handleTabPress,
      handleSuggestionAccept,
      handleHistoryUp,
      handleHistoryDown,
      handleChange,
      cancelQuery,
    },
    state: {
      isProcessing,
    },
  };
}
