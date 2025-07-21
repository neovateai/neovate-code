import React from 'react';
import stringWidth from 'string-width';

interface TruncationOptions {
  maxLines?: number;
  terminalWidth?: number;
  forceMaxChars?: number;
}

interface TruncationResult {
  shouldTruncate: boolean;
  truncatedText: string;
  originalLength: number;
  truncatedLength: number;
  extraLines: number;
}

export function calculateTextTruncation(
  text: string,
  options: TruncationOptions = {},
): TruncationResult {
  const {
    maxLines = Math.max(20, Math.floor((options.terminalWidth || 80) / 4)),
    terminalWidth = 80,
    forceMaxChars,
  } = options;

  const lines = text.split('\n');
  const maxChars = forceMaxChars || terminalWidth * maxLines;

  let totalWidth = 0;
  let lineCount = 0;
  const truncatedLines: string[] = [];

  for (const line of lines) {
    const lineWidth = stringWidth(line) + 1; // +1 for newline

    // Check if adding this complete line would exceed limits
    if (totalWidth + lineWidth > maxChars || lineCount >= maxLines) {
      // Try to fit part of the current line if there's remaining space
      const remainingWidth = maxChars - totalWidth;
      if (remainingWidth > 1 && lineCount < maxLines) {
        // Need at least 1 char space
        const partialLine = truncateStringToWidth(line, remainingWidth - 1);
        if (partialLine.length > 0) {
          truncatedLines.push(partialLine);
          totalWidth += stringWidth(partialLine);
        }
      }

      const extraLines = lines.length - lineCount;
      return {
        shouldTruncate: true,
        truncatedText: truncatedLines.join('\n'),
        originalLength: stringWidth(text),
        truncatedLength: totalWidth,
        extraLines,
      };
    }

    truncatedLines.push(line);
    totalWidth += lineWidth;
    lineCount++;
  }

  return {
    shouldTruncate: false,
    truncatedText: text,
    originalLength: stringWidth(text),
    truncatedLength: stringWidth(text),
    extraLines: 0,
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

function truncateStringToWidth(str: string, maxWidth: number): string {
  if (stringWidth(str) <= maxWidth) {
    return str;
  }

  let result = '';
  let currentWidth = 0;

  for (const char of str) {
    const charWidth = stringWidth(char);
    if (currentWidth + charWidth > maxWidth) {
      break;
    }
    result += char;
    currentWidth += charWidth;
  }

  return result;
}
