import chalk from 'chalk';
import { Text, useInput } from 'ink';
import React, { useEffect, useRef, useState } from 'react';
import type { Except } from 'type-fest';
import { getCurrentLineInfo, moveToLine } from './utils/cursor-utils';

// UI Display Constants
const DEFAULT_MAX_LINES = 8;
const MAX_PASTE_HIGHLIGHT_LENGTH = 1;

export type TextInputProps = {
  /**
   * Text to display when `value` is empty.
   */
  readonly placeholder?: string;

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
   * Maximum number of lines to display (for multiline mode). When exceeded,
   * the display will scroll to show recent lines.
   */
  readonly maxLines?: number;

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
   * Function to call when `Tab` is pressed for auto-suggestion navigation.
   */
  readonly onTabPress?: (isShiftTab: boolean) => void;

  /**
   * Force cursor position to a specific offset.
   */
  readonly cursorPosition?: number;

  /**
   * Callback when cursor position changes
   */
  readonly onCursorPositionChange?: (pos: number) => void;
};

function findPrevWordJump(prompt: string, cursorOffset: number) {
  const regex = /[\s,.;!?]+/g;
  let lastMatch = 0;
  let currentMatch: RegExpExecArray | null;

  const stringToCursorOffset = prompt
    .slice(0, cursorOffset)
    .replace(/[\s,.;!?]+$/, '');

  // Loop through all matches
  while ((currentMatch = regex.exec(stringToCursorOffset)) !== null) {
    lastMatch = currentMatch.index;
  }

  // Include the last match unless it is the first character
  if (lastMatch != 0) {
    lastMatch += 1;
  }
  return lastMatch;
}

function findNextWordJump(prompt: string, cursorOffset: number) {
  const regex = /[\s,.;!?]+/g;
  let currentMatch: RegExpExecArray | null;

  // Loop through all matches
  while ((currentMatch = regex.exec(prompt)) !== null) {
    if (currentMatch.index > cursorOffset) {
      return currentMatch.index + 1;
    }
  }

  return prompt.length;
}

function TextInput({
  value: originalValue,
  placeholder = '',
  focus = true,
  mask,
  highlightPastedText = false,
  showCursor = true,
  maxLines,
  onChange,
  onSubmit,
  onTabPress,
  cursorPosition,
  onCursorPositionChange,
}: TextInputProps) {
  const [state, setState] = useState({
    cursorOffset: (originalValue || '').length,
    cursorWidth: 0,
  });

  // Use ref to keep track of the latest value to avoid race conditions
  const latestValueRef = useRef(originalValue || '');
  const latestCursorOffsetRef = useRef(state.cursorOffset);

  const { cursorOffset, cursorWidth } = state;

  // Update refs when values change
  useEffect(() => {
    latestValueRef.current = originalValue || '';
  }, [originalValue]);

  useEffect(() => {
    latestCursorOffsetRef.current = cursorOffset;
  }, [cursorOffset]);

  useEffect(() => {
    setState((previousState) => {
      if (!focus || !showCursor) {
        return previousState;
      }

      const newValue = originalValue || '';

      if (previousState.cursorOffset > newValue.length - 1) {
        return {
          cursorOffset: newValue.length,
          cursorWidth: 0,
        };
      }

      return previousState;
    });
  }, [originalValue, focus, showCursor]);

  // Handle cursor position changes
  useEffect(() => {
    if (cursorPosition !== undefined && focus && showCursor) {
      setState({
        cursorOffset: Math.min(cursorPosition, (originalValue || '').length),
        cursorWidth: 0,
      });
    }
  }, [cursorPosition, originalValue, focus, showCursor]);

  useEffect(() => {
    if (onCursorPositionChange) {
      // Use React's scheduler to avoid race conditions
      const timeoutId = setTimeout(() => {
        onCursorPositionChange(state.cursorOffset);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [state.cursorOffset, onCursorPositionChange]);

  const cursorActualWidth = highlightPastedText ? cursorWidth : 0;

  const value = mask ? mask.repeat(originalValue.length) : originalValue;

  // Handle maxLines display limitation
  let displayValue = value;
  if (maxLines && maxLines > 0) {
    const lines = value.split('\n');
    if (lines.length > maxLines) {
      // Find which line contains the cursor
      const valueBeforeCursor = value.slice(0, cursorOffset);
      const linesBeforeCursor = valueBeforeCursor.split('\n');
      const cursorLine = linesBeforeCursor.length - 1;

      // Calculate display window
      let startLine = 0;
      let endLine = maxLines;

      // Check if cursor is at the end of the text
      const isAtEnd = cursorOffset === value.length;
      const isNearEnd = cursorLine >= lines.length - Math.ceil(maxLines / 2);

      if (isAtEnd || isNearEnd) {
        // If cursor is at end or near end, show the last maxLines
        startLine = Math.max(0, lines.length - maxLines);
        endLine = lines.length;
      } else if (cursorLine >= maxLines) {
        // Cursor is beyond visible area, scroll to show cursor in the middle
        const halfMaxLines = Math.floor(maxLines / 2);
        startLine = Math.max(0, cursorLine - halfMaxLines);
        endLine = Math.min(lines.length, startLine + maxLines);
      } else if (cursorLine < 0) {
        // Cursor is before visible area
        startLine = 0;
        endLine = maxLines;
      }

      const displayLines = lines.slice(startLine, endLine);
      displayValue = displayLines.join('\n');

      // Note: cursor offset adjustment is handled in the rendering logic below
    }
  }

  let renderedValue = displayValue;
  let renderedPlaceholder = placeholder ? chalk.grey(placeholder) : undefined;

  // Fake mouse cursor, because it's too inconvenient to deal with actual cursor and ansi escapes.
  if (showCursor && focus) {
    renderedPlaceholder =
      placeholder.length > 0
        ? chalk.inverse(placeholder[0]) + chalk.grey(placeholder.slice(1))
        : chalk.inverse(' ');

    renderedValue = displayValue.length > 0 ? '' : chalk.inverse(' ');

    let i = 0;
    let actualCursorOffset = cursorOffset;

    // Adjust cursor offset if we're showing a subset of lines
    if (maxLines && maxLines > 0) {
      const lines = value.split('\n');
      if (lines.length > maxLines) {
        const valueBeforeCursor = value.slice(0, cursorOffset);
        const linesBeforeCursor = valueBeforeCursor.split('\n');
        const cursorLine = linesBeforeCursor.length - 1;

        let startLine = 0;

        // Use the same logic as the display calculation
        const isAtEnd = cursorOffset === value.length;
        const isNearEnd = cursorLine >= lines.length - Math.ceil(maxLines / 2);

        if (isAtEnd || isNearEnd) {
          // If cursor is at end or near end, show the last maxLines
          startLine = Math.max(0, lines.length - maxLines);
        } else if (cursorLine >= maxLines) {
          // Cursor is beyond visible area, scroll to show cursor in the middle
          const halfMaxLines = Math.floor(maxLines / 2);
          startLine = Math.max(0, cursorLine - halfMaxLines);
        }

        if (startLine > 0) {
          const hiddenPortion = lines.slice(0, startLine).join('\n') + '\n';
          actualCursorOffset = cursorOffset - hiddenPortion.length;
        }
      }
    }

    for (const char of displayValue) {
      renderedValue +=
        i >= actualCursorOffset - cursorActualWidth && i <= actualCursorOffset
          ? chalk.inverse(char)
          : char;

      i++;
    }

    if (displayValue.length > 0 && actualCursorOffset === displayValue.length) {
      renderedValue += chalk.inverse(' ');
    }
  }

  useInput(
    (input, key) => {
      if (key.ctrl && input === 'c') {
        return;
      }

      if (key.tab || (key.shift && key.tab)) {
        if (onTabPress) {
          onTabPress(key.shift && key.tab);
          return;
        } else {
          return;
        }
      }

      let nextCursorOffset = cursorOffset;
      let nextValue = originalValue;
      let nextCursorWidth = 0;

      // Handle up/down arrow keys for multiline navigation
      if (key.upArrow || key.downArrow) {
        if (showCursor) {
          const { currentLine, columnInLine } = getCurrentLineInfo(
            originalValue,
            cursorOffset,
          );

          if (key.upArrow && currentLine > 0) {
            nextCursorOffset = moveToLine(
              originalValue,
              currentLine - 1,
              columnInLine,
            );
          } else if (key.downArrow) {
            const lines = originalValue.split('\n');
            if (currentLine < lines.length - 1) {
              nextCursorOffset = moveToLine(
                originalValue,
                currentLine + 1,
                columnInLine,
              );
            }
          }
        }
      } else if (key.return) {
        if (key.ctrl) {
          // Ctrl+Enter inserts a newline
          nextValue =
            originalValue.slice(0, cursorOffset) +
            '\n' +
            originalValue.slice(cursorOffset, originalValue.length);
          nextCursorOffset++;
        } else if (key.meta) {
          // This does not work yet. We would like to have this behavior:
          //     Mac terminal: Settings → Profiles → Keyboard → Use Option as Meta key
          //     iTerm2: Open Settings → Profiles → Keys → General → Set Left/Right Option as Esc+
          // And then when Option+ENTER is pressed, we want to insert a newline.
          // However, even with the settings, the input="\n" and only key.shift is True.
          // This is likely an artifact of how ink works.
          nextValue =
            originalValue.slice(0, cursorOffset) +
            '\n' +
            originalValue.slice(cursorOffset, originalValue.length);
          nextCursorOffset++;
        } else {
          // Handle Enter key: support bash-style line continuation with backslash
          // -- count consecutive backslashes immediately before cursor
          // -- only a single trailing backslash at end indicates line continuation
          const isAtEnd = cursorOffset === originalValue.length;
          const trailingMatch = originalValue.match(/\\+$/);
          const trailingCount = trailingMatch ? trailingMatch[0].length : 0;
          if (isAtEnd && trailingCount === 1) {
            nextValue += '\n';
            nextCursorOffset = nextValue.length;
            nextCursorWidth = 0;
          } else if (onSubmit) {
            onSubmit(originalValue);
            return;
          }
        }
      } else if ((key.ctrl && input === 'a') || (key.meta && key.leftArrow)) {
        nextCursorOffset = 0;
      } else if ((key.ctrl && input === 'e') || (key.meta && key.rightArrow)) {
        // Move cursor to end of line
        nextCursorOffset = originalValue.length;
        // Emacs/readline-style navigation and editing shortcuts
      } else if (key.ctrl && input === 'b') {
        // Move cursor backward by one
        if (showCursor) {
          nextCursorOffset = Math.max(cursorOffset - 1, 0);
        }
      } else if (key.ctrl && input === 'f') {
        // Move cursor forward by one
        if (showCursor) {
          nextCursorOffset = Math.min(cursorOffset + 1, originalValue.length);
        }
      } else if (key.ctrl && input === 'd') {
        // Delete character at cursor (forward delete)
        if (cursorOffset < originalValue.length) {
          nextValue =
            originalValue.slice(0, cursorOffset) +
            originalValue.slice(cursorOffset + 1);
        }
      } else if (key.ctrl && input === 'k') {
        // Kill text from cursor to end of line
        nextValue = originalValue.slice(0, cursorOffset);
      } else if (key.ctrl && input === 'u') {
        // Kill text from start to cursor
        nextValue = originalValue.slice(cursorOffset);
        nextCursorOffset = 0;
      } else if (key.ctrl && input === 'w') {
        // Delete the word before cursor
        {
          const left = originalValue.slice(0, cursorOffset);
          const match = left.match(/\s*\S+$/);
          const cut = match ? match[0].length : cursorOffset;
          nextValue =
            originalValue.slice(0, cursorOffset - cut) +
            originalValue.slice(cursorOffset);
          nextCursorOffset = cursorOffset - cut;
        }
      } else if (key.meta && (key.backspace || key.delete)) {
        const regex = /[\s,.;!?]+/g;
        let lastMatch = 0;
        let currentMatch: RegExpExecArray | null;

        const stringToCursorOffset = originalValue
          .slice(0, cursorOffset)
          .replace(/[\s,.;!?]+$/, '');

        // Loop through all matches
        while ((currentMatch = regex.exec(stringToCursorOffset)) !== null) {
          lastMatch = currentMatch.index;
        }

        // Include the last match unless it is the first character
        if (lastMatch != 0) {
          lastMatch += 1;
        }

        nextValue =
          stringToCursorOffset.slice(0, lastMatch) +
          originalValue.slice(cursorOffset, originalValue.length);
        nextCursorOffset = lastMatch;
      } else if (key.meta && (input === 'b' || key.leftArrow)) {
        nextCursorOffset = findPrevWordJump(originalValue, cursorOffset);
      } else if (key.meta && (input === 'f' || key.rightArrow)) {
        nextCursorOffset = findNextWordJump(originalValue, cursorOffset);
      } else if (key.leftArrow) {
        if (showCursor) {
          nextCursorOffset--;
        }
      } else if (key.rightArrow) {
        if (showCursor) {
          nextCursorOffset++;
        }
      } else if (key.backspace || key.delete) {
        if (cursorOffset > 0) {
          nextValue =
            originalValue.slice(0, cursorOffset - 1) +
            originalValue.slice(cursorOffset, originalValue.length);

          nextCursorOffset--;
        }
      } else {
        // Handle regular input and paste operations with functional update
        const newValue =
          originalValue.slice(0, cursorOffset) +
          input +
          originalValue.slice(cursorOffset, originalValue.length);

        const newCursorOffset = cursorOffset + input.length;

        // Don't highlight large pastes to avoid rendering issues
        const newCursorWidth =
          input.length > MAX_PASTE_HIGHLIGHT_LENGTH ? 0 : 0;

        setState({
          cursorOffset: newCursorOffset,
          cursorWidth: newCursorWidth,
        });

        if (newValue !== originalValue) {
          onChange(newValue);
        }
        return;
      }

      // Fix boundary checks to use nextCursorOffset instead of cursorOffset
      if (nextCursorOffset < 0) {
        nextCursorOffset = 0;
      }

      if (nextCursorOffset > nextValue.length) {
        nextCursorOffset = nextValue.length;
      }

      setState({
        cursorOffset: nextCursorOffset,
        cursorWidth: nextCursorWidth,
      });

      if (nextValue !== originalValue) {
        onChange(nextValue);
      }
    },
    { isActive: focus },
  );

  return (
    <Text>
      {placeholder
        ? displayValue.length > 0
          ? renderedValue
          : renderedPlaceholder
        : renderedValue}
    </Text>
  );
}

export default TextInput;

type UncontrolledProps = {
  readonly initialValue?: string;
} & Except<TextInputProps, 'value' | 'onChange'>;

export function UncontrolledTextInput({
  initialValue = '',
  ...props
}: UncontrolledProps) {
  const [value, setValue] = useState(initialValue);

  return <TextInput {...props} value={value} onChange={setValue} />;
}
