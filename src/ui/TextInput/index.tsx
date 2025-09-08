import chalk from 'chalk';
import { Text, useInput } from 'ink';
import { type Key } from 'ink';
import React from 'react';
import { PASTE_CONFIG } from '../constants';
import { darkTheme } from './constant';
import { useTextInput } from './hooks/useTextInput';
import { isImagePath, processImageFromPath } from './utils/imagePaste';

export type Props = {
  /**
   * Optional callback for handling history navigation on up arrow at start of input
   */
  readonly onHistoryUp?: () => void;

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
  readonly onImagePaste?: (base64Image: string) => void;

  /**
   * Optional callback when a large text (over 800 chars) is pasted
   */
  readonly onPaste?: (text: string) => void;

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
  onHistoryDown,
  onExitMessage,
  onMessage,
  onEscape,
  onHistoryReset,
  columns,
  onImagePaste,
  onPaste,
  isDimmed = false,
  disableCursorMovementForUpDownKeys = false,
  cursorOffset,
  onChangeCursorOffset,
  onTabPress,
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
    onHistoryDown,
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
      const mergedInput = chunks.join('');

      // Reset state immediately
      pasteStateRef.current = {
        chunks: [],
        timeoutId: null,
        firstInputTime: null,
        lastInputTime: null,
        totalLength: 0,
      };

      // Process the merged input if we have collected chunks
      if (chunks.length > 0) {
        // Check if merged content is an image path
        if (onImagePaste && isImagePathText(mergedInput)) {
          (async () => {
            try {
              const imageResult = await processImageFromPath(mergedInput);
              if (imageResult) {
                onImagePaste(imageResult.base64);
              } else {
                onPaste?.(mergedInput);
              }
            } catch (error) {
              console.error('Failed to process image path:', error);
              onPaste?.(mergedInput);
            }
          })();
        } else {
          // Process as regular paste if it meets paste criteria
          // Either large total content or multiple chunks indicating paste behavior
          const isPastePattern =
            totalLength > PASTE_CONFIG.LARGE_INPUT_THRESHOLD ||
            chunks.length > 2;
          if (isPastePattern) {
            onPaste?.(mergedInput);
          } else {
            // Process each chunk as individual input if not paste-like
            chunks.forEach((chunk) =>
              onInput(chunk, { name: '' } as unknown as Key),
            );
          }
        }
      }
    }, PASTE_CONFIG.TIMEOUT_MS);

    pasteStateRef.current.timeoutId = timeoutId;
  };

  const wrappedOnInput = (input: string, key: Key): void => {
    const isImageFormat = isImagePathText(input);
    const currentState = pasteStateRef.current;
    const currentTime = Date.now();

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
    const isLargeInput = input.length > PASTE_CONFIG.LARGE_INPUT_THRESHOLD;
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
      const currentTimeout = pasteStateRef.current.timeoutId;
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
      // Reset all state on unmount
      pasteStateRef.current = {
        chunks: [],
        timeoutId: null,
        firstInputTime: null,
        lastInputTime: null,
        totalLength: 0,
      };
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

  const showPlaceholder = originalValue.length == 0 && placeholder;
  return (
    <Text wrap="truncate-end" dimColor={isDimmed}>
      {showPlaceholder ? renderedPlaceholder : renderedValue}
    </Text>
  );
}
