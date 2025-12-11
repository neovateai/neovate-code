import type { Key } from 'ink';
import { useState } from 'react';
import { useAppStore } from '../../store';
import { Cursor } from '../utils/Cursor';
import {
  CLIPBOARD_ERROR_MESSAGE,
  getImageFromClipboard,
  getImageFromClipboardLegacy,
} from '../utils/imagePaste';
import { useDoublePress } from './useDoublePress';

// Note: This placeholder is now dynamic, but keeping for backward compatibility
const IMAGE_PLACEHOLDER = '[Image pasted]';

type MaybeCursor = void | Cursor;
type InputHandler = (input: string) => MaybeCursor;
type InputMapper = (input: string) => MaybeCursor;
function mapInput(input_map: Array<[string, InputHandler]>): InputMapper {
  return (input: string): MaybeCursor => {
    const handler = new Map(input_map).get(input) ?? (() => {});
    return handler(input);
  };
}

type UseTextInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  onExit?: () => void;
  onExitMessage?: (show: boolean, key?: string) => void;
  onMessage?: (show: boolean, message?: string) => void;
  onEscape?: () => void;
  onHistoryUp?: () => void;
  onQueuedMessagesUp?: () => void;
  onHistoryDown?: () => void;
  onHistoryReset?: () => void;
  onReverseSearch?: () => void;
  onReverseSearchPrevious?: () => void;
  focus?: boolean;
  mask?: string;
  multiline?: boolean;
  cursorChar: string;
  highlightPastedText?: boolean;
  invert: (text: string) => string;
  themeText: (text: string) => string;
  columns: number;
  onImagePaste?: (base64Image: string) => void;
  disableCursorMovementForUpDownKeys?: boolean;
  externalOffset: number;
  onOffsetChange: (offset: number) => void;
  onTabPress?: (isShiftTab: boolean) => void;
  onExternalEdit?: () => void;
  onCtrlBBackground?: () => void;
};

type UseTextInputResult = {
  renderedValue: string;
  onInput: (input: string, key: Key) => void;
  offset: number;
  setOffset: (offset: number) => void;
};

export function useTextInput({
  value: originalValue,
  onChange,
  onSubmit,
  onExit,
  onExitMessage,
  onMessage,
  onEscape,
  onHistoryUp,
  onQueuedMessagesUp,
  onHistoryDown,
  onHistoryReset,
  onReverseSearch,
  onReverseSearchPrevious,
  mask = '',
  multiline = false,
  cursorChar,
  invert,
  columns,
  onImagePaste,
  disableCursorMovementForUpDownKeys = false,
  externalOffset,
  onOffsetChange,
  onTabPress,
  onExternalEdit,
  onCtrlBBackground,
}: UseTextInputProps): UseTextInputResult {
  const { toggleThinking } = useAppStore();
  const offset = externalOffset;
  const setOffset = onOffsetChange;
  const cursor = Cursor.fromText(originalValue, columns, offset);
  const [imagePasteErrorTimeout, setImagePasteErrorTimeout] =
    useState<NodeJS.Timeout | null>(null);

  function maybeClearImagePasteErrorTimeout() {
    if (!imagePasteErrorTimeout) {
      return;
    }
    clearTimeout(imagePasteErrorTimeout);
    setImagePasteErrorTimeout(null);
    onMessage?.(false);
  }

  const handleCtrlC = useDoublePress(
    (show) => {
      maybeClearImagePasteErrorTimeout();
      onExitMessage?.(show, 'Ctrl-C');
    },
    () => onExit?.(),
    () => {
      if (originalValue) {
        onChange('');
        onHistoryReset?.();
      }
    },
  );

  // Keep Escape for clearing input or custom action
  const handleEscape = () => {
    maybeClearImagePasteErrorTimeout();
    if (onEscape) {
      onEscape();
      return;
    }
  };

  function clear() {
    return Cursor.fromText('', columns, 0);
  }

  const handleEmptyCtrlD = useDoublePress(
    (show) => onExitMessage?.(show, 'Ctrl-D'),
    () => onExit?.(),
  );

  function handleCtrlD(): MaybeCursor {
    maybeClearImagePasteErrorTimeout();
    if (cursor.text === '') {
      // When input is empty, handle double-press
      handleEmptyCtrlD();
      return cursor;
    }
    // When input is not empty, delete forward like iPython
    return cursor.forwardDelete();
  }

  // Helper function to show success message
  const showSuccessMessage = () => {
    onMessage?.(true, 'Image pasted successfully');
    setImagePasteErrorTimeout(
      setTimeout(() => {
        onMessage?.(false);
      }, 2000),
    );
  };

  // Helper function to show error message
  const showErrorMessage = (message: string, timeout: number = 4000) => {
    onMessage?.(true, message);
    setImagePasteErrorTimeout(
      setTimeout(() => {
        onMessage?.(false);
      }, timeout),
    );
  };

  // Helper function to handle successful image processing
  const handleImageProcessResult = async (
    base64Image: string,
  ): Promise<void> => {
    const result = await onImagePaste?.(base64Image);
    // @ts-expect-error - result is not typed
    const content = result?.prompt || IMAGE_PLACEHOLDER;
    const newCursor = cursor.insert(content);
    setOffset(newCursor.offset);
    onChange(newCursor.text);
    showSuccessMessage();
  };

  async function tryImagePaste() {
    maybeClearImagePasteErrorTimeout();

    try {
      const imageResult = await getImageFromClipboard();

      if (imageResult) {
        await handleImageProcessResult(imageResult.base64);
        return;
      }

      const base64Image = getImageFromClipboardLegacy();

      if (base64Image === null) {
        let errorMessage = CLIPBOARD_ERROR_MESSAGE;

        if (process.platform !== 'darwin') {
          errorMessage = `Image paste is not supported on ${process.platform} platform`;
        }

        showErrorMessage(errorMessage);
        return;
      }

      await handleImageProcessResult(base64Image);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      showErrorMessage(`Image paste failed: ${errorMsg}`);
    }

    return cursor;
  }

  const handleCtrl = mapInput([
    ['a', () => cursor.startOfLine()],
    [
      'b',
      () => {
        // Handle Ctrl+B for background prompt if callback exists
        if (onCtrlBBackground) {
          onCtrlBBackground();
          return cursor; // Don't move cursor for background action
        }
        return cursor.left(); // Default behavior: move cursor left
      },
    ],
    ['c', handleCtrlC],
    ['d', handleCtrlD],
    ['e', () => cursor.endOfLine()],
    ['f', () => cursor.right()],
    [
      'g',
      () => {
        onExternalEdit?.();
        return cursor;
      },
    ],
    ['h', () => cursor.backspace()],
    ['k', () => cursor.deleteToLineEnd()],
    ['l', () => clear()],
    ['n', () => downOrHistoryDown()],
    ['p', () => upOrHistoryUp()],
    [
      'r',
      () => {
        onReverseSearch?.();
        return cursor;
      },
    ],
    [
      's',
      () => {
        onReverseSearchPrevious?.();
        return cursor;
      },
    ],
    ['u', () => cursor.deleteToLineStart()],
    ['v', () => tryImagePaste()],
    ['w', () => cursor.deleteWordBefore()],
    [
      't',
      () => {
        toggleThinking();
        return cursor;
      },
    ],
  ]);

  const handleMeta = mapInput([
    ['b', () => cursor.prevWord()],
    ['f', () => cursor.nextWord()],
    ['d', () => cursor.deleteWordAfter()],
  ]);

  function handleEnter(key: Key) {
    if (
      multiline &&
      cursor.offset > 0 &&
      cursor.text[cursor.offset - 1] === '\\'
    ) {
      return cursor.backspace().insert('\n');
    }
    if (key.meta) {
      return cursor.insert('\n');
    }
    onSubmit?.(originalValue);
  }

  function upOrHistoryUp() {
    if (disableCursorMovementForUpDownKeys) {
      onHistoryUp?.();
      return cursor;
    }
    const cursorUp = cursor.up();
    if (cursorUp.equals(cursor)) {
      onHistoryUp?.();
    }
    return cursorUp;
  }
  function queuedMessagesUp() {
    onQueuedMessagesUp?.();
    return cursor;
  }
  function downOrHistoryDown() {
    if (disableCursorMovementForUpDownKeys) {
      onHistoryDown?.();
      return cursor;
    }
    const cursorDown = cursor.down();
    if (cursorDown.equals(cursor)) {
      onHistoryDown?.();
    }
    return cursorDown;
  }

  function mapKey(key: Key): InputMapper {
    switch (true) {
      case key.escape:
        return handleEscape;
      case key.leftArrow && (key.ctrl || key.meta):
        return () => cursor.prevWord();
      case key.rightArrow && (key.ctrl || key.meta):
        return () => cursor.nextWord();
      case key.backspace:
        return key.meta
          ? () => cursor.deleteWordBefore()
          : () => cursor.backspace();
      case key.delete:
        return key.meta ? () => cursor.deleteToLineEnd() : () => cursor.del();
      case key.ctrl:
        return handleCtrl;
      case key.pageDown:
        return () => cursor.endOfLine();
      case key.pageUp:
        return () => cursor.startOfLine();
      case key.meta: {
        if (key.upArrow) {
          return queuedMessagesUp;
        }
        return handleMeta;
      }
      case key.return:
        return () => handleEnter(key);
      case key.tab:
      case key.shift && key.tab:
        return () => onTabPress?.(key.shift && key.tab);
      case key.upArrow:
        return upOrHistoryUp;
      case key.downArrow:
        return downOrHistoryDown;
      case key.leftArrow:
        return () => cursor.left();
      case key.rightArrow:
        return () => cursor.right();
    }
    return (input: string) => {
      switch (true) {
        // Home key
        case input === '\x1b[H' || input === '\x1b[1~':
          return cursor.startOfLine();
        // End key
        case input === '\x1b[F' || input === '\x1b[4~':
          return cursor.endOfLine();
        default:
          // Check if input might be an image path and handle accordingly
          if (cursor.isAtStart() && (input === '!' || input === '#')) {
            return cursor.insert(input.replace(/\r/g, '\n')).left();
          }

          // For image path detection, we'll let the wrappedOnInput in TextInput handle it
          // via the paste detection mechanism
          return cursor.insert(input.replace(/\r/g, '\n'));
      }
    };
  }

  function onInput(input: string, key: Key): void {
    const nextCursor = mapKey(key)(input);
    if (nextCursor) {
      if (!cursor.equals(nextCursor)) {
        setOffset(nextCursor.offset);
        if (cursor.text !== nextCursor.text) {
          onChange(nextCursor.text || '');
        }
      }
    }
  }

  return {
    onInput,
    renderedValue: cursor.render(cursorChar, mask, invert),
    offset,
    setOffset,
  };
}
