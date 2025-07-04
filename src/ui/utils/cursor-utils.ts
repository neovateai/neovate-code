export interface LineInfo {
  currentLine: number;
  columnInLine: number;
  lines: string[];
}

export function getCurrentLineInfo(
  text: string,
  cursorOffset: number,
): LineInfo {
  const lines = text.split('\n');
  let currentOffset = 0;
  let currentLine = 0;
  let columnInLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;

    if (currentOffset + lineLength >= cursorOffset) {
      currentLine = i;
      columnInLine = cursorOffset - currentOffset;
      break;
    }

    currentOffset += lineLength + 1; // +1 for the newline character
  }

  return { currentLine, columnInLine, lines };
}

export function moveToLine(
  text: string,
  targetLine: number,
  targetColumn: number,
): number {
  const lines = text.split('\n');

  if (targetLine < 0) {
    return 0;
  }

  if (targetLine >= lines.length) {
    return text.length;
  }

  let offset = 0;
  for (let i = 0; i < targetLine; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }

  const lineLength = lines[targetLine].length;
  const columnInLine = Math.min(targetColumn, lineLength);

  return offset + columnInLine;
}
