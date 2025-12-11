import chalk from 'chalk';
import { type Key, Text, useInput } from 'ink';
import React from 'react';
import { PASTE_CONFIG } from '../constants';
import { darkTheme } from './constant';
import { useTextInput } from './hooks/useTextInput';
import { isImagePath, processImageFromPath } from './utils/imagePaste';

// Helper function to insert text at cursor position
function insertTextAtCursor(
  text: string,
  originalValue: string,
  cursorOffset: number,
): { newValue: string; newCursorOffset: number } {
  const safeOffset = Math.max(0, Math.min(cursorOffset, originalValue.length));
  const beforeCursor = originalValue.slice(0, safeOffset);
  const afterCursor = originalValue.slice(safeOffset);
  return {
    newValue: beforeCursor + text + afterCursor,
    newCursorOffset: safeOffset + text.length,
  };
}

export type Props = {
  /**
   * Optional callback for handling history navigation on up arrow at start of input
   */
  readonly onHistoryUp?: () => void;

  /**
   * Optional callback for handling queued messages on alt+up arrow (option+up on macOS)
   */
  readonly onQueuedMessagesUp?: () => void;

  /**
   * Optional callback for handling history navigation on down arrow at end of input
   */
  readonly onHistoryDown?: () => void;

  /**
   * Text to display when `value` is empty.
   */
  readonly placeholder?: string;

  /**
   * Allow multi-line input via line ending with backslash (default: `true`)
   */
  readonly multiline?: boolean;

  /**
   * Listen to user's input. Useful in case there are multiple input components
   * at the same time and input must be "routed" to a specific component.
   */
  readonly focus?: boolean;

  /**
   * Replace all chars and mask the value. Useful for password inputs.
   */
  readonly mask?: string;

  /**
   * Whether to show cursor and allow navigation inside text input with arrow keys.
   */
  readonly showCursor?: boolean;

  /**
   * Highlight pasted text
   */
  readonly highlightPastedText?: boolean;

  /**
   * Value to display in a text input.
   */
  readonly value: string;

  /**
   * Function to call when value updates.
   */
  readonly onChange: (value: string) => void;

  /**
   * Function to call when `Enter` is pressed, where first argument is a value of the input.
   */
  readonly onSubmit?: (value: string) => void;

  /**
   * Function to call when Ctrl+C is pressed to exit.
   */
  readonly onExit?: () => void;

  /**
   * Optional callback to show exit message
   */
  readonly onExitMessage?: (show: boolean, key?: string) => void;

  /**
   * Optional callback to show custom message
   */
  readonly onMessage?: (show: boolean, message?: string) => void;

  /**
   * Optional callback when Escape key is pressed
   */
  readonly onEscape?: () => void;

  /**
   * Optional callback when Escape key is pressed twice quickly
   */
  readonly onDoubleEscape?: () => void;

  /**
   * Optional callback to reset history position
   */
  readonly onHistoryReset?: () => void;

  /**
   * Number of columns to wrap text at
   */
  readonly columns: number;

  /**
   * Optional callback when an image is pasted
   */
  readonly onImagePaste?: (
    base64Image: string,
  ) => Promise<{ prompt?: string }> | void;

  /**
   * Optional callback when a large text (over 800 chars) is pasted
   */
  readonly onPaste?: (text: string) => Promise<{ prompt?: string }> | void;

  /**
   * Whether the input is dimmed and non-interactive
   */
  readonly isDimmed?: boolean;

  /**
   * Whether to disable cursor movement for up/down arrow keys
   */
  readonly disableCursorMovementForUpDownKeys?: boolean;

  readonly cursorOffset: number;

  /**
   * Callback to set the offset of the cursor
   */
  onChangeCursorOffset: (offset: number) => void;

  /**
   * Function to call when `Tab` is pressed for auto-suggestion navigation.
   */
  readonly onTabPress?: (isShiftTab: boolean) => void;

  /**
   * Function to call when `Delete` or `Backspace` is pressed.
   */
  readonly onDelete?: () => void;

  /**
   * Optional callback when Ctrl+G is pressed to edit prompt in external editor.
   */
  readonly onExternalEdit?: () => void;

  /**
   * Optional callback when Ctrl+R is pressed for reverse search.
   */
  readonly onReverseSearch?: () => void;

  /**
   * Optional callback when Ctrl+S is pressed for reverse search previous.
   */
  readonly onReverseSearchPrevious?: () => void;

  onCtrlBBackground?: () => void;
};

export default function TextInput({
  value: originalValue,
  placeholder = '',
  focus = true,
  mask,
  multiline = false,
  highlightPastedText = false,
  showCursor = true,
  onChange,
  onSubmit,
  onExit,
  onHistoryUp,
  onQueuedMessagesUp,
  onHistoryDown,
  onExitMessage,
  onMessage,
  onEscape,
  onDoubleEscape,
  onHistoryReset,
  columns,
  onImagePaste,
  onPaste,
  isDimmed = false,
  disableCursorMovementForUpDownKeys = false,
  cursorOffset,
  onChangeCursorOffset,
  onTabPress,
  onDelete,
  onExternalEdit,
  onReverseSearch,
  onReverseSearchPrevious,
  onCtrlBBackground,
}: Props): React.JSX.Element {
  const { onInput, renderedValue } = useTextInput({
    value: originalValue,
    onChange,
    onSubmit,
    onExit,
    onExitMessage,
    onMessage,
    onEscape,
    onHistoryReset,
    onHistoryUp,
    onQueuedMessagesUp,
    onHistoryDown,
    onReverseSearch,
    onReverseSearchPrevious,
    focus,
    mask,
    multiline,
    cursorChar: showCursor ? ' ' : '',
    highlightPastedText,
    invert: chalk.inverse,
    themeText: (text: string) => chalk.hex(darkTheme.text)(text),
    columns,
    onImagePaste,
    disableCursorMovementForUpDownKeys,
    externalOffset: cursorOffset,
    onOffsetChange: onChangeCursorOffset,
    onTabPress,
    onExternalEdit,
    onCtrlBBackground,
  });

  // Enhanced paste detection state for multi-chunk text merging
  const pasteStateRef = React.useRef<{
    chunks: string[];
    timeoutId: ReturnType<typeof setTimeout> | null;
    firstInputTime: number | null;
    lastInputTime: number | null;
    totalLength: number;
  }>({
    chunks: [],
    timeoutId: null,
    firstInputTime: null,
    lastInputTime: null,
    totalLength: 0,
  });

  // Track ESC key timing for double-press detection
  const escPressRef = React.useRef<{
    lastPressTime: number | null;
    timeoutId: ReturnType<typeof setTimeout> | null;
  }>({
    lastPressTime: null,
    timeoutId: null,
  });

  // Check if text matches image path format
  const isImagePathText = (text: string): boolean => {
    try {
      return isImagePath(text);
    } catch {
      // Fallback regex check
      const imageExtensionRegex = /\.(png|jpe?g|gif|webp)$/i;
      const cleanedText = text.trim().replace(/^["']|["']$/g, '');
      return imageExtensionRegex.test(cleanedText);
    }
  };

  // Enhanced paste timeout with chunk merging for multi-part pastes
  const processPendingChunks = () => {
    const currentState = pasteStateRef.current;
    if (currentState.timeoutId) {
      clearTimeout(currentState.timeoutId);
    }

    const timeoutId = setTimeout(() => {
      const chunks = pasteStateRef.current.chunks;
      const totalLength = pasteStateRef.current.totalLength;

      if (chunks.length === 0) return;

      const mergedInput = chunks.join('');

      // Reset state for next input sequence
      pasteStateRef.current = {
        chunks: [],
        timeoutId: null,
        firstInputTime: null,
        lastInputTime: null,
        totalLength: 0,
      };

      // Check if merged content might be an image path
      if (onImagePaste && isImagePathText(mergedInput)) {
        // Try to process as image path
        (async () => {
          try {
            const imageResult = await processImageFromPath(mergedInput);
            if (imageResult) {
              const imagePromptResult = await onImagePaste(imageResult.base64);
              if (imagePromptResult?.prompt) {
                const { newValue, newCursorOffset } = insertTextAtCursor(
                  imagePromptResult.prompt,
                  originalValue,
                  cursorOffset,
                );
                onChange(newValue);
                onChangeCursorOffset(newCursorOffset);
              }
            } else {
              // Not a valid image path, treat as regular text
              const result = await onPaste?.(mergedInput);
              if (result?.prompt) {
                const { newValue, newCursorOffset } = insertTextAtCursor(
                  result.prompt,
                  originalValue,
                  cursorOffset,
                );
                onChange(newValue);
                onChangeCursorOffset(newCursorOffset);
              }
            }
          } catch (error) {
            // Error processing image, treat as regular text
            console.error('Failed to process image path:', error);
            const result = await onPaste?.(mergedInput);
            if (result?.prompt) {
              const { newValue, newCursorOffset } = insertTextAtCursor(
                result.prompt,
                originalValue,
                cursorOffset,
              );
              onChange(newValue);
              onChangeCursorOffset(newCursorOffset);
            }
          }
        })();
      } else {
        // Process as regular paste if it meets paste criteria
        // Multiple conditions to detect paste behavior:
        // 1. Large total content
        // 2. Multiple chunks indicating paste behavior
        // 3. Content with multiple lines (common in code/text paste)
        // 4. Medium-sized content with multiple chunks (lower threshold for multi-chunk)
        const hasMultipleLines = mergedInput.includes('\n');
        const isMediumSizeMultiChunk =
          totalLength > PASTE_CONFIG.MEDIUM_SIZE_MULTI_CHUNK_THRESHOLD &&
          chunks.length > 3;
        const isPastePattern =
          totalLength > PASTE_CONFIG.LARGE_INPUT_THRESHOLD ||
          hasMultipleLines ||
          isMediumSizeMultiChunk;
        if (isPastePattern) {
          (async () => {
            const result = await onPaste?.(mergedInput);
            if (result?.prompt) {
              const { newValue, newCursorOffset } = insertTextAtCursor(
                result.prompt,
                originalValue,
                cursorOffset,
              );
              onChange(newValue);
              onChangeCursorOffset(newCursorOffset);
            }
          })();
        } else {
          onInput(mergedInput.replace(/\r$/, ''), {
            name: '',
          } as unknown as Key);
        }
      }
    }, PASTE_CONFIG.TIMEOUT_MS);

    pasteStateRef.current.timeoutId = timeoutId;
  };

  const wrappedOnInput = (input: string, key: Key): void => {
    // Handle double-ESC for conversation forking
    if (key.escape && onDoubleEscape) {
      const now = Date.now();
      const lastPress = escPressRef.current.lastPressTime;

      if (lastPress && now - lastPress < 500) {
        // Double ESC detected
        if (escPressRef.current.timeoutId) {
          clearTimeout(escPressRef.current.timeoutId);
        }
        escPressRef.current.lastPressTime = null;
        escPressRef.current.timeoutId = null;
        onDoubleEscape();
        return;
      }

      // First ESC press
      escPressRef.current.lastPressTime = now;
      if (escPressRef.current.timeoutId) {
        clearTimeout(escPressRef.current.timeoutId);
      }
      escPressRef.current.timeoutId = setTimeout(() => {
        escPressRef.current.lastPressTime = null;
        escPressRef.current.timeoutId = null;
      }, 500);
    }

    // Call onDelete when backspace or delete key is pressed
    if ((key.backspace || key.delete) && onDelete) {
      onDelete();
    }

    const isImageFormat = isImagePathText(input);
    const currentState = pasteStateRef.current;
    const currentTime = Date.now();

    // Check if this is a single newline from Shift+Enter or Meta+Enter
    // These should be processed as regular input, not paste
    const isSingleNewline = input === '\n' && (key.shift || key.meta);

    if (isSingleNewline) {
      // Process Shift+Enter or Meta+Enter directly as regular input
      onInput(input, key);
      return;
    }

    // Initialize timing on first input
    if (!currentState.firstInputTime) {
      currentState.firstInputTime = currentTime;
    }
    currentState.lastInputTime = currentTime;

    // Calculate time since first input in this sequence
    const timeSinceFirst =
      currentTime - (currentState.firstInputTime || currentTime);

    // Detect paste patterns:
    // 1. Large single input
    // 2. Image path format
    // 3. Rapid consecutive inputs
    // 4. Already collecting chunks (continuation of paste)
    // 5. Input with multiple lines (common in paste operations) - but exclude single newlines
    // 6. Medium-sized input (likely copy-paste even if not huge)
    const isLargeInput = input.length > PASTE_CONFIG.LARGE_INPUT_THRESHOLD;
    const hasMultipleNewlines = input.includes('\n') && input.length > 1;
    const isRapidSequence =
      timeSinceFirst < PASTE_CONFIG.RAPID_INPUT_THRESHOLD_MS &&
      currentState.chunks.length > 0;
    const isNewRapidInput =
      timeSinceFirst < PASTE_CONFIG.RAPID_INPUT_THRESHOLD_MS &&
      input.length > 10;
    const isAlreadyCollecting = currentState.timeoutId !== null;

    const isPasteCandidate =
      onPaste &&
      (isLargeInput ||
        hasMultipleNewlines ||
        isImageFormat ||
        isRapidSequence ||
        isNewRapidInput ||
        isAlreadyCollecting);

    if (isPasteCandidate) {
      // Add to chunks for merging
      currentState.chunks.push(input);
      currentState.totalLength += input.length;
      processPendingChunks();
      return;
    }

    // Reset state for normal single character input
    if (input.length === 1 && !currentState.timeoutId) {
      currentState.chunks = [];
      currentState.firstInputTime = null;
      currentState.lastInputTime = null;
      currentState.totalLength = 0;
    }

    // Process as regular input immediately
    onInput(input, key);
  };

  // Cleanup timeout on unmount and reset state
  React.useEffect(() => {
    return () => {
      if (pasteStateRef.current.timeoutId) {
        clearTimeout(pasteStateRef.current.timeoutId);
      }
      if (escPressRef.current.timeoutId) {
        clearTimeout(escPressRef.current.timeoutId);
      }
    };
  }, []);

  useInput(wrappedOnInput, { isActive: focus });

  let renderedPlaceholder = placeholder
    ? chalk.hex(darkTheme.secondaryText)(placeholder)
    : undefined;

  // Fake mouse cursor, because we like punishment
  if (showCursor && focus) {
    renderedPlaceholder =
      placeholder.length > 0
        ? chalk.inverse(placeholder[0]) +
          chalk.hex(darkTheme.secondaryText)(placeholder.slice(1))
        : chalk.inverse(' ');
  }

  const showPlaceholder = originalValue.length === 0 && placeholder;
  return (
    <Text wrap="truncate-end" dimColor={isDimmed}>
      {showPlaceholder ? renderedPlaceholder : renderedValue}
    </Text>
  );
}
