import chalk from 'chalk';
import { Text, useInput } from 'ink';
import { type Key } from 'ink';
import React from 'react';
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

  // Enhanced paste detection state with image path support
  // Use ref to avoid state race conditions during fast sequential updates
  const pasteStateRef = React.useRef<{
    chunks: string[];
    timeoutId: ReturnType<typeof setTimeout> | null;
  }>({ chunks: [], timeoutId: null });

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

  // Enhanced paste timeout with image path detection
  const resetPasteTimeout = () => {
    const currentState = pasteStateRef.current;
    if (currentState.timeoutId) {
      clearTimeout(currentState.timeoutId);
    }

    const timeoutId = setTimeout(() => {
      const chunks = pasteStateRef.current.chunks;
      const pastedText = chunks.join('');

      // Reset state immediately to prevent data loss
      pasteStateRef.current = { chunks: [], timeoutId: null };

      // Check if pasted content might be an image path
      if (onImagePaste && isImagePathText(pastedText)) {
        // Try to process as image path
        (async () => {
          try {
            const imageResult = await processImageFromPath(pastedText);
            if (imageResult) {
              // Successfully loaded image from path
              onImagePaste(imageResult.base64);
            } else {
              // Not a valid image path, treat as regular text
              const result = await onPaste?.(pastedText);
              if (result?.prompt) {
                onChange(originalValue + result.prompt);
              }
            }
          } catch (error) {
            // Error processing image, treat as regular text
            console.error('Failed to process image path:', error);
            const result = await onPaste?.(pastedText);
            if (result?.prompt) {
              onChange(originalValue + result.prompt);
            }
          }
        })();
      } else {
        // Regular text paste processing
        (async () => {
          const result = await onPaste?.(pastedText);
          if (result?.prompt) {
            onChange(originalValue + result.prompt);
          }
        })();
      }
    }, 300); // 增加超时时间从100ms到300ms，提高大量文本粘贴的可靠性

    pasteStateRef.current.timeoutId = timeoutId;
  };

  const wrappedOnInput = (input: string, key: Key): void => {
    // Check if input might be an image path (immediate check for small inputs)
    const isImageFormat = isImagePathText(input);

    // Handle pastes (>600 chars) or potential image paths or existing timeout
    // Lower threshold to catch more paste scenarios
    // Usually we get one or two input characters at a time. If we
    // get a bunch, the user has probably pasted.
    // Unfortunately node batches long pastes, so it's possible
    // that we would see e.g. 1024 characters and then just a few
    // more in the next frame that belong with the original paste.
    // This batching number is not consistent.
    if (
      onPaste &&
      (input.length > 600 || pasteStateRef.current.timeoutId || isImageFormat)
    ) {
      // Use ref to avoid state race conditions
      pasteStateRef.current.chunks.push(input);
      resetPasteTimeout();
      return;
    }

    onInput(input, key);
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (pasteStateRef.current.timeoutId) {
        clearTimeout(pasteStateRef.current.timeoutId);
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

  const showPlaceholder = originalValue.length == 0 && placeholder;
  return (
    <Text wrap="truncate-end" dimColor={isDimmed}>
      {showPlaceholder ? renderedPlaceholder : renderedValue}
    </Text>
  );
}
