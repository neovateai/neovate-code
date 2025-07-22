import React from 'react';
import stringWidth from 'string-width';

interface TextDisplayResult {
  totalLines: number;
  content: string[];
  displayWidth: number;
}

export function calculateTextTruncation(
  text: string,
  terminalWidth: number = 80,
): TextDisplayResult {
  const lines = text.split('\n');
  const displayLines: string[] = [];
  let totalLines = 0;
  let maxDisplayWidth = 0;

  for (const line of lines) {
    const lineWidth = stringWidth(line);

    if (lineWidth === 0) {
      // 空行
      displayLines.push('');
      totalLines += 1;
    } else if (lineWidth <= terminalWidth) {
      // 单行显示
      displayLines.push(line);
      totalLines += 1;
      maxDisplayWidth = Math.max(maxDisplayWidth, lineWidth);
    } else {
      // 需要换行的长行
      const wrappedLines = wrapLineToTerminalWidth(line, terminalWidth);
      displayLines.push(...wrappedLines);
      totalLines += wrappedLines.length;
      maxDisplayWidth = terminalWidth;
    }
  }

  return {
    totalLines,
    content: displayLines,
    displayWidth: maxDisplayWidth,
  };
}

export function useTerminalWidth() {
  const [terminalWidth, setTerminalWidth] = React.useState(
    process.stdout.columns || 80,
  );

  React.useEffect(() => {
    const handleResize = () => {
      setTerminalWidth(process.stdout.columns || 80);
    };

    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.on('resize', handleResize);

      return () => {
        process.stdout.off('resize', handleResize);
      };
    }
  }, []);

  return terminalWidth;
}

function wrapLineToTerminalWidth(
  line: string,
  terminalWidth: number,
): string[] {
  const wrappedLines: string[] = [];
  let currentLine = '';
  let currentWidth = 0;

  for (const char of line) {
    const charWidth = stringWidth(char);

    if (currentWidth + charWidth > terminalWidth) {
      wrappedLines.push(currentLine);
      currentLine = char;
      currentWidth = charWidth;
    } else {
      currentLine += char;
      currentWidth += charWidth;
    }
  }

  if (currentLine.length > 0) {
    wrappedLines.push(currentLine);
  }

  return wrappedLines.length > 0 ? wrappedLines : [''];
}
