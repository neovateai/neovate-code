import type { Key } from 'ink';
import { useState } from 'react';
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
  onHistoryDown?: () => void;
  onHistoryReset?: () => void;
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
  onHistoryDown,
  onHistoryReset,
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
}: UseTextInputProps): UseTextInputResult {
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
  const handleEscape = useDoublePress(
    (show) => {
      maybeClearImagePasteErrorTimeout();
      // If onEscape callback is provided, call it instead of showing clear message
      if (onEscape) {
        onEscape();
        return;
      }
      onMessage?.(!!originalValue && show, `Press Escape again to clear`);
    },
    () => {
      // Only clear input if no custom onEscape handler
      if (!onEscape && originalValue) {
        onChange('');
      }
    },
  );
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

  async function tryImagePaste() {
    maybeClearImagePasteErrorTimeout();

    try {
      // Try new cross-platform method first
      const imageResult = await getImageFromClipboard();

      if (imageResult) {
        // Successfully pasted image with enhanced method
        onImagePaste?.(imageResult.base64);
        onMessage?.(true, 'Image pasted successfully');
        setImagePasteErrorTimeout(
          setTimeout(() => {
            onMessage?.(false);
          }, 2000),
        );

        return cursor.insert(IMAGE_PLACEHOLDER);
      }

      // Fall back to legacy method for macOS compatibility
      const base64Image = getImageFromClipboardLegacy();

      if (base64Image === null) {
        let errorMessage = CLIPBOARD_ERROR_MESSAGE;

        if (process.platform !== 'darwin') {
          errorMessage = `Image paste is not supported on ${process.platform} platform`;
        }

        onMessage?.(true, errorMessage);
        setImagePasteErrorTimeout(
          setTimeout(() => {
            onMessage?.(false);
          }, 4000),
        );
        return cursor;
      }

      // Successfully pasted image with legacy method
      onImagePaste?.(base64Image);
      onMessage?.(true, 'Image pasted successfully');
      setImagePasteErrorTimeout(
        setTimeout(() => {
          onMessage?.(false);
        }, 2000),
      );

      return cursor.insert(IMAGE_PLACEHOLDER);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      onMessage?.(true, `Image paste failed: ${errorMsg}`);
      setImagePasteErrorTimeout(
        setTimeout(() => {
          onMessage?.(false);
        }, 4000),
      );
      return cursor;
    }
  }

  const handleCtrl = mapInput([
    ['a', () => cursor.startOfLine()],
    ['b', () => cursor.left()],
    ['c', handleCtrlC],
    ['d', handleCtrlD],
    ['e', () => cursor.endOfLine()],
    ['f', () => cursor.right()],
    ['h', () => cursor.backspace()],
    ['k', () => cursor.deleteToLineEnd()],
    ['l', () => clear()],
    ['n', () => downOrHistoryDown()],
    ['p', () => upOrHistoryUp()],
    ['u', () => cursor.deleteToLineStart()],
    ['v', () => tryImagePaste()],
    ['w', () => cursor.deleteWordBefore()],
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
      // already at beginning
      onHistoryUp?.();
    }
    return cursorUp;
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
      case key.meta:
        return handleMeta;
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
        case input == '\x1b[H' || input == '\x1b[1~':
          return cursor.startOfLine();
        // End key
        case input == '\x1b[F' || input == '\x1b[4~':
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
        if (cursor.text != nextCursor.text) {
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
