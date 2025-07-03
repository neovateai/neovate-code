import chalk from 'chalk';
import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import stringWidth from 'string-width';
import type { Except } from 'type-fest';

export type TextInputProps = {
  /**
   * Text to display when `value` is empty.
   */
  readonly placeholder?: string;

  /**
   * Listen to user's input. Useful in case there are multiple input components
   * at the same time and input must be "routed" to a specific component.
   */
  readonly focus?: boolean; // eslint-disable-line react/boolean-prop-naming

  /**
   * Replace all chars and mask the value. Useful for password inputs.
   */
  readonly mask?: string;

  /**
   * Whether to show cursor and allow navigation inside text input with arrow keys.
   */
  readonly showCursor?: boolean; // eslint-disable-line react/boolean-prop-naming

  /**
   * Highlight pasted text
   */
  readonly highlightPastedText?: boolean; // eslint-disable-line react/boolean-prop-naming

  /**
   * Enable multiline input support
   */
  readonly multiline?: boolean; // eslint-disable-line react/boolean-prop-naming

  /**
   * Maximum number of lines to display (for multiline mode)
   */
  readonly maxLines?: number;

  /**
   * Maximum width for text wrapping
   */
  readonly maxWidth?: number;

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
};

function sanitizeText(str: string): string {
  // 规范化换行符
  const normalized = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return normalized
    .split('')
    .filter((char) => {
      const code = char.codePointAt(0);
      if (code === undefined) return false;

      // 保留更多字符类型
      return (
        // 可打印 ASCII 字符 (32-126)
        (code >= 32 && code <= 126) ||
        // 换行符
        code === 10 ||
        // 制表符
        code === 9 ||
        // Unicode 字符 (大于 127)
        code > 127
      );
    })
    .join('');
}

// 使用 string-width 计算字符的视觉宽度
function getCharWidth(char: string): number {
  return stringWidth(char);
}

// 使用 string-width 计算字符串的视觉宽度
function getStringWidth(str: string): number {
  return stringWidth(str);
}

// 工具函数：将文本分割为视觉行（考虑换行和宽度）
function wrapText(text: string, maxWidth: number): string[] {
  if (!text) return [''];

  const lines = text.split('\n');
  const wrappedLines: string[] = [];

  for (const line of lines) {
    const lineWidth = getStringWidth(line);
    if (lineWidth <= maxWidth) {
      wrappedLines.push(line);
    } else {
      // 智能换行：优先在空格处断行，考虑视觉宽度
      let currentLine = '';
      let currentWidth = 0;
      const words = line.split(' ');

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordWidth = getStringWidth(word);

        // 如果单个词就超过最大宽度，则按字符强制分割
        if (wordWidth > maxWidth) {
          // 先处理当前行
          if (currentLine) {
            wrappedLines.push(currentLine.trim());
            currentLine = '';
            currentWidth = 0;
          }

          // 按字符分割长词
          let partialWord = '';
          let partialWidth = 0;

          for (const char of word) {
            const charWidth = getCharWidth(char);
            if (partialWidth + charWidth > maxWidth) {
              if (partialWord) {
                wrappedLines.push(partialWord);
              }
              partialWord = char;
              partialWidth = charWidth;
            } else {
              partialWord += char;
              partialWidth += charWidth;
            }
          }

          if (partialWord) {
            currentLine = partialWord;
            currentWidth = partialWidth;
          }
        } else {
          // 计算加上这个词后的宽度（包括空格）
          const spaceWidth = currentLine ? 1 : 0; // 空格宽度
          const testWidth = currentWidth + spaceWidth + wordWidth;

          if (testWidth <= maxWidth) {
            if (currentLine) {
              currentLine += ' ' + word;
              currentWidth += spaceWidth + wordWidth;
            } else {
              currentLine = word;
              currentWidth = wordWidth;
            }
          } else {
            // 超出宽度，换行
            if (currentLine) {
              wrappedLines.push(currentLine);
            }
            currentLine = word;
            currentWidth = wordWidth;
          }
        }
      }

      // 处理最后一行
      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    }
  }

  return wrappedLines.length ? wrappedLines : [''];
}

// 计算光标在视觉行中的位置
function getCursorVisualPosition(
  text: string,
  cursorOffset: number,
  maxWidth: number,
): [number, number] {
  const beforeCursor = text.slice(0, cursorOffset);
  const lines = beforeCursor.split('\n');

  let visualRow = 0;
  let visualCol = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineWidth = getStringWidth(line);

    if (i === lines.length - 1) {
      // 最后一行，计算具体位置
      if (lineWidth <= maxWidth) {
        visualCol = lineWidth;
      } else {
        // 需要换行的情况，计算光标在哪个视觉行
        let currentWidth = 0;
        let charIndex = 0;

        for (const char of line) {
          const charWidth = getCharWidth(char);
          if (currentWidth + charWidth > maxWidth) {
            visualRow++;
            currentWidth = charWidth;
          } else {
            currentWidth += charWidth;
          }
          charIndex++;
        }
        visualCol = currentWidth;
      }
    } else {
      // 不是最后一行，计算该行占用的视觉行数
      if (lineWidth <= maxWidth) {
        visualRow += 1;
      } else {
        let currentWidth = 0;
        for (const char of line) {
          const charWidth = getCharWidth(char);
          if (currentWidth + charWidth > maxWidth) {
            visualRow++;
            currentWidth = charWidth;
          } else {
            currentWidth += charWidth;
          }
        }
        visualRow += 1; // 为换行符再加一行
      }
    }
  }

  return [visualRow, visualCol];
}

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
  multiline = false,
  maxLines = 8,
  maxWidth = 80,
  onChange,
  onSubmit,
  onTabPress,
  cursorPosition,
}: TextInputProps) {
  const [state, setState] = useState({
    cursorOffset: (originalValue || '').length,
    cursorWidth: 0,
    scrollOffset: 0,
  });

  const { cursorOffset, cursorWidth, scrollOffset } = state;

  useEffect(() => {
    setState((previousState) => {
      if (!focus || !showCursor) {
        return previousState;
      }

      const newValue = originalValue || '';

      if (previousState.cursorOffset > newValue.length - 1) {
        return {
          ...previousState,
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
      setState((prev) => ({
        ...prev,
        cursorOffset: Math.min(cursorPosition, (originalValue || '').length),
        cursorWidth: 0,
      }));
    }
  }, [cursorPosition, originalValue, focus, showCursor]);

  const cursorActualWidth = highlightPastedText ? cursorWidth : 0;

  const value = mask ? mask.repeat(originalValue.length) : originalValue;

  // 计算多行数据
  const multilineData = useMemo(() => {
    if (!multiline) return null;

    const visualLines = wrapText(value, maxWidth);
    const safeCursorOffset = Math.min(Math.max(0, cursorOffset), value.length);
    const [cursorRow, cursorCol] = getCursorVisualPosition(
      value,
      safeCursorOffset,
      maxWidth,
    );

    return {
      visualLines,
      cursorRow,
      cursorCol,
      totalLines: visualLines.length,
    };
  }, [value, cursorOffset, maxWidth, multiline]);

  // 自动调整滚动位置
  useEffect(() => {
    if (multiline && multilineData) {
      const { cursorRow, totalLines } = multilineData;

      setState((prev) => {
        let newScrollOffset = prev.scrollOffset;

        if (cursorRow < newScrollOffset) {
          newScrollOffset = cursorRow;
        } else if (cursorRow >= newScrollOffset + maxLines) {
          newScrollOffset = Math.max(0, cursorRow - maxLines + 1);
        }

        // 确保滚动不超出范围
        if (totalLines <= maxLines) {
          newScrollOffset = 0;
        } else if (newScrollOffset > totalLines - maxLines) {
          newScrollOffset = Math.max(0, totalLines - maxLines);
        }

        return { ...prev, scrollOffset: newScrollOffset };
      });
    }
  }, [multiline, multilineData, maxLines]);

  // 渲染逻辑
  const renderContent = () => {
    if (multiline && multilineData) {
      // 多行模式
      const { visualLines, cursorRow, cursorCol } = multilineData;
      const visibleLines = visualLines.slice(
        scrollOffset,
        scrollOffset + maxLines,
      );

      return (
        <Box flexDirection="column">
          {visibleLines.map((line, index) => {
            const actualRow = scrollOffset + index;
            let displayLine = line;

            // 添加光标
            if (actualRow === cursorRow && showCursor && focus) {
              if (cursorCol < line.length) {
                const char = line[cursorCol];
                displayLine =
                  line.slice(0, cursorCol) +
                  chalk.inverse(char) +
                  line.slice(cursorCol + 1);
              } else {
                displayLine = line + chalk.inverse(' ');
              }
            }

            return <Text key={index}>{displayLine || ' '}</Text>;
          })}

          {/* 滚动指示器 */}
          {(scrollOffset > 0 ||
            scrollOffset + maxLines < multilineData.totalLines) && (
            <Box justifyContent="flex-end">
              <Text color="gray" dimColor>
                {scrollOffset > 0 ? '↑ ' : '  '}
                {scrollOffset + 1}-
                {Math.min(scrollOffset + maxLines, multilineData.totalLines)}/
                {multilineData.totalLines}
                {scrollOffset + maxLines < multilineData.totalLines ? ' ↓' : ''}
              </Text>
            </Box>
          )}
        </Box>
      );
    } else {
      // 单行模式 (原有逻辑)
      let renderedValue = value;
      let renderedPlaceholder = placeholder
        ? chalk.grey(placeholder)
        : undefined;

      if (showCursor && focus) {
        renderedPlaceholder =
          placeholder.length > 0
            ? chalk.inverse(placeholder[0]) + chalk.grey(placeholder.slice(1))
            : chalk.inverse(' ');

        renderedValue = value.length > 0 ? '' : chalk.inverse(' ');

        let i = 0;

        for (const char of value) {
          renderedValue +=
            i >= cursorOffset - cursorActualWidth && i <= cursorOffset
              ? chalk.inverse(char)
              : char;

          i++;
        }

        if (value.length > 0 && cursorOffset === value.length) {
          renderedValue += chalk.inverse(' ');
        }
      }

      return (
        <Text>
          {placeholder
            ? value.length > 0
              ? renderedValue
              : renderedPlaceholder
            : renderedValue}
        </Text>
      );
    }
  };

  useInput(
    (input, key) => {
      if (key.ctrl && input === 'c') {
        return;
      }

      // 在多行模式下处理上下键进行行间移动
      if (multiline && (key.upArrow || key.downArrow)) {
        if (!multilineData) return;

        const { visualLines, cursorRow, cursorCol, totalLines } = multilineData;
        const lines = value.split('\n');

        if (key.upArrow) {
          // 如果在第一行，不处理，让 ChatInput 处理历史记录
          if (cursorRow === 0) {
            return;
          }

          // 移动到上一行的相似位置
          let currentLineStart = 0;
          let currentLineIndex = 0;

          // 找到当前光标所在的逻辑行
          for (let i = 0; i < lines.length; i++) {
            const lineEnd = currentLineStart + lines[i].length;
            if (cursorOffset >= currentLineStart && cursorOffset <= lineEnd) {
              currentLineIndex = i;
              break;
            }
            currentLineStart = lineEnd + 1; // +1 for newline
          }

          if (currentLineIndex > 0) {
            // 计算在当前行的列位置
            const colInCurrentLine = cursorOffset - currentLineStart;
            const prevLineLength = lines[currentLineIndex - 1].length;
            const targetCol = Math.min(colInCurrentLine, prevLineLength);

            // 计算上一行的开始位置
            let prevLineStart = 0;
            for (let i = 0; i < currentLineIndex - 1; i++) {
              prevLineStart += lines[i].length + 1;
            }

            const newCursorOffset = prevLineStart + targetCol;
            setState((prev) => ({
              ...prev,
              cursorOffset: newCursorOffset,
              cursorWidth: 0,
            }));
          }
          return;
        }

        if (key.downArrow) {
          // 如果在最后一行，不处理，让 ChatInput 处理历史记录
          if (cursorRow === totalLines - 1) {
            return;
          }

          // 移动到下一行的相似位置
          let currentLineStart = 0;
          let currentLineIndex = 0;

          // 找到当前光标所在的逻辑行
          for (let i = 0; i < lines.length; i++) {
            const lineEnd = currentLineStart + lines[i].length;
            if (cursorOffset >= currentLineStart && cursorOffset <= lineEnd) {
              currentLineIndex = i;
              break;
            }
            currentLineStart = lineEnd + 1; // +1 for newline
          }

          if (currentLineIndex < lines.length - 1) {
            // 计算在当前行的列位置
            const colInCurrentLine = cursorOffset - currentLineStart;
            const nextLineLength = lines[currentLineIndex + 1].length;
            const targetCol = Math.min(colInCurrentLine, nextLineLength);

            // 计算下一行的开始位置
            const nextLineStart =
              currentLineStart + lines[currentLineIndex].length + 1;

            const newCursorOffset = nextLineStart + targetCol;
            setState((prev) => ({
              ...prev,
              cursorOffset: newCursorOffset,
              cursorWidth: 0,
            }));
          }
          return;
        }
      } else if (key.upArrow || key.downArrow) {
        // 单行模式下，不处理上下键，让 ChatInput 处理
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

      // 处理回车键
      if (key.return) {
        if (multiline && (key.ctrl || key.meta)) {
          // 多行模式下，Ctrl+Enter 插入换行
          nextValue =
            originalValue.slice(0, cursorOffset) +
            '\n' +
            originalValue.slice(cursorOffset, originalValue.length);
          nextCursorOffset = cursorOffset + 1;
        } else if (multiline && key.shift) {
          // 多行模式下，Shift+Enter 也插入换行
          nextValue =
            originalValue.slice(0, cursorOffset) +
            '\n' +
            originalValue.slice(cursorOffset, originalValue.length);
          nextCursorOffset = cursorOffset + 1;
        } else {
          // 普通 Enter 提交
          if (onSubmit) {
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
      } else if (input) {
        // 处理普通字符输入和粘贴，使用文本清理
        const cleanedInput = sanitizeText(input);
        nextValue =
          originalValue.slice(0, cursorOffset) +
          cleanedInput +
          originalValue.slice(cursorOffset, originalValue.length);

        nextCursorOffset += cleanedInput.length;

        if (cleanedInput.length > 1) {
          nextCursorWidth = cleanedInput.length;
        }
      }

      if (nextCursorOffset < 0) {
        nextCursorOffset = 0;
      }

      if (nextCursorOffset > nextValue.length) {
        nextCursorOffset = nextValue.length;
      }

      setState((prev) => ({
        ...prev,
        cursorOffset: nextCursorOffset,
        cursorWidth: nextCursorWidth,
      }));

      if (nextValue !== originalValue) {
        onChange(nextValue);
      }
    },
    { isActive: focus },
  );

  return renderContent();
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
