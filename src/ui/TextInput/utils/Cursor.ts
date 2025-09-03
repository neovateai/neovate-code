import wrapAnsi from 'wrap-ansi';

type WrappedText = string[];
type Position = {
  line: number;
  column: number;
};

export class Cursor {
  readonly offset: number;
  constructor(
    readonly measuredText: MeasuredText,
    offset: number = 0,
    readonly selection: number = 0,
  ) {
    // it's ok for the cursor to be 1 char beyond the end of the string
    this.offset = Math.max(0, Math.min(this.measuredText.text.length, offset));
  }

  static fromText(
    text: string,
    columns: number,
    offset: number = 0,
    selection: number = 0,
  ): Cursor {
    // make MeasuredText on less than columns width, to account for cursor
    return new Cursor(new MeasuredText(text, columns - 1), offset, selection);
  }

  render(cursorChar: string, mask: string, invert: (text: string) => string) {
    const { line, column } = this.getPosition();
    return this.measuredText
      .getWrappedText()
      .map((text, currentLine, allLines) => {
        let displayText = text;
        if (mask && currentLine === allLines.length - 1) {
          const lastSixStart = Math.max(0, text.length - 6);
          displayText = mask.repeat(lastSixStart) + text.slice(lastSixStart);
        }
        // looking for the line with the cursor
        if (line != currentLine) return displayText.trimEnd();

        return (
          displayText.slice(0, column) +
          invert(displayText[column] || cursorChar) +
          displayText.trimEnd().slice(column + 1)
        );
      })
      .join('\n');
  }

  left(): Cursor {
    return new Cursor(this.measuredText, this.offset - 1);
  }

  right(): Cursor {
    return new Cursor(this.measuredText, this.offset + 1);
  }

  up(): Cursor {
    const { line, column } = this.getPosition();
    if (line == 0) {
      return new Cursor(this.measuredText, 0, 0);
    }

    const newOffset = this.getOffset({ line: line - 1, column });
    return new Cursor(this.measuredText, newOffset, 0);
  }

  down(): Cursor {
    const { line, column } = this.getPosition();
    if (line >= this.measuredText.lineCount - 1) {
      return new Cursor(this.measuredText, this.text.length, 0);
    }

    const newOffset = this.getOffset({ line: line + 1, column });
    return new Cursor(this.measuredText, newOffset, 0);
  }

  startOfLine(): Cursor {
    const { line } = this.getPosition();
    return new Cursor(
      this.measuredText,
      this.getOffset({
        line,
        column: 0,
      }),
      0,
    );
  }

  endOfLine(): Cursor {
    const { line } = this.getPosition();
    const column = this.measuredText.getLineLength(line);
    const offset = this.getOffset({ line, column });
    return new Cursor(this.measuredText, offset, 0);
  }

  nextWord(): Cursor {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let nextCursor: Cursor = this;
    // If we're on a word, move to the next non-word
    while (nextCursor.isOverWordChar() && !nextCursor.isAtEnd()) {
      nextCursor = nextCursor.right();
    }
    // now move to the next word char
    while (!nextCursor.isOverWordChar() && !nextCursor.isAtEnd()) {
      nextCursor = nextCursor.right();
    }
    return nextCursor;
  }

  prevWord(): Cursor {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let cursor: Cursor = this;

    // if we are already at the beginning of a word, step off it
    if (!cursor.left().isOverWordChar()) {
      cursor = cursor.left();
    }

    // Move left over any non-word characters
    while (!cursor.isOverWordChar() && !cursor.isAtStart()) {
      cursor = cursor.left();
    }

    // If we're over a word character, move to the start of this word
    if (cursor.isOverWordChar()) {
      while (cursor.left().isOverWordChar() && !cursor.isAtStart()) {
        cursor = cursor.left();
      }
    }

    return cursor;
  }

  private modifyText(end: Cursor, insertString: string = ''): Cursor {
    const startOffset = this.offset;
    const endOffset = end.offset;

    const newText =
      this.text.slice(0, startOffset) +
      insertString +
      this.text.slice(endOffset);

    return Cursor.fromText(
      newText,
      this.columns,
      startOffset + insertString.length,
    );
  }

  insert(insertString: string): Cursor {
    const newCursor = this.modifyText(this, insertString);
    return newCursor;
  }

  del(): Cursor {
    // Delete key should delete the character before the cursor (same as backspace)
    if (this.isAtStart()) {
      return this;
    }
    return this.left().modifyText(this);
  }

  forwardDelete(): Cursor {
    // Ctrl+D should delete the character at the cursor position (forward delete)
    if (this.isAtEnd()) {
      return this;
    }
    return this.modifyText(this.right());
  }

  backspace(): Cursor {
    if (this.isAtStart()) {
      return this;
    }
    return this.left().modifyText(this);
  }

  deleteToLineStart(): Cursor {
    return this.startOfLine().modifyText(this);
  }

  deleteToLineEnd(): Cursor {
    // If cursor is on a newline character, delete just that character
    if (this.text[this.offset] === '\n') {
      return this.modifyText(this.right());
    }

    return this.modifyText(this.endOfLine());
  }

  deleteWordBefore(): Cursor {
    if (this.isAtStart()) {
      return this;
    }
    return this.prevWord().modifyText(this);
  }

  deleteWordAfter(): Cursor {
    if (this.isAtEnd()) {
      return this;
    }

    return this.modifyText(this.nextWord());
  }

  private isOverWordChar(): boolean {
    const currentChar = this.text[this.offset] ?? '';
    return /\w/.test(currentChar);
  }

  equals(other: Cursor): boolean {
    return (
      this.offset === other.offset && this.measuredText == other.measuredText
    );
  }

  public isAtStart(): boolean {
    return this.offset == 0;
  }
  public isAtEnd(): boolean {
    return this.offset == this.text.length;
  }

  public get text(): string {
    return this.measuredText.text;
  }

  private get columns(): number {
    return this.measuredText.columns + 1;
  }

  private getPosition(): Position {
    return this.measuredText.getPositionFromOffset(this.offset);
  }

  private getOffset(position: Position): number {
    return this.measuredText.getOffsetFromPosition(position);
  }
}

class WrappedLine {
  constructor(
    public readonly text: string,
    public readonly startOffset: number,
    public readonly isPrecededByNewline: boolean,
    public readonly endsWithNewline: boolean = false,
  ) {}

  equals(other: WrappedLine): boolean {
    return this.text === other.text && this.startOffset === other.startOffset;
  }

  get length(): number {
    return this.text.length + (this.endsWithNewline ? 1 : 0);
  }
}

export class MeasuredText {
  private wrappedLines: WrappedLine[];

  constructor(
    readonly text: string,
    readonly columns: number,
  ) {
    this.wrappedLines = this.measureWrappedText();
  }

  private measureWrappedText(): WrappedLine[] {
    const wrappedText = wrapAnsi(this.text, this.columns, {
      hard: true,
      trim: false,
    });

    const wrappedLines: WrappedLine[] = [];
    let searchOffset = 0;
    let lastNewLinePos = -1;

    const lines = wrappedText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i]!;
      const isPrecededByNewline = (startOffset: number) =>
        i == 0 || (startOffset > 0 && this.text[startOffset - 1] === '\n');

      if (text.length === 0) {
        // For blank lines, find the next newline character after the last one
        lastNewLinePos = this.text.indexOf('\n', lastNewLinePos + 1);

        if (lastNewLinePos !== -1) {
          const startOffset = lastNewLinePos;
          const endsWithNewline = true;

          wrappedLines.push(
            new WrappedLine(
              text,
              startOffset,
              isPrecededByNewline(startOffset),
              endsWithNewline,
            ),
          );
        } else {
          // If we can't find another newline, this must be the end of text
          const startOffset = this.text.length;
          wrappedLines.push(
            new WrappedLine(
              text,
              startOffset,
              isPrecededByNewline(startOffset),
              false,
            ),
          );
        }
      } else {
        // For non-blank lines
        const startOffset = this.text.indexOf(text, searchOffset);
        if (startOffset === -1) {
          console.log('Debug: Failed to find wrapped line in original text');
          console.log('Debug: Current text:', text);
          console.log('Debug: Full original text:', this.text);
          console.log('Debug: Search offset:', searchOffset);
          console.log('Debug: Wrapped text:', wrappedText);
          throw new Error('Failed to find wrapped line in original text');
        }

        searchOffset = startOffset + text.length;

        // Check if this line ends with a newline in the original text
        const potentialNewlinePos = startOffset + text.length;
        const endsWithNewline =
          potentialNewlinePos < this.text.length &&
          this.text[potentialNewlinePos] === '\n';

        if (endsWithNewline) {
          lastNewLinePos = potentialNewlinePos;
        }

        wrappedLines.push(
          new WrappedLine(
            text,
            startOffset,
            isPrecededByNewline(startOffset),
            endsWithNewline,
          ),
        );
      }
    }

    return wrappedLines;
  }

  public getWrappedText(): WrappedText {
    return this.wrappedLines.map((line) =>
      line.isPrecededByNewline ? line.text : line.text.trimStart(),
    );
  }

  private getLine(line: number): WrappedLine {
    return this.wrappedLines[
      Math.max(0, Math.min(line, this.wrappedLines.length - 1))
    ]!;
  }

  public getOffsetFromPosition(position: Position): number {
    const wrappedLine = this.getLine(position.line);
    const startOffsetPlusColumn = wrappedLine.startOffset + position.column;

    // Handle blank lines specially
    if (wrappedLine.text.length === 0 && wrappedLine.endsWithNewline) {
      return wrappedLine.startOffset;
    }

    // For normal lines
    const lineEnd = wrappedLine.startOffset + wrappedLine.text.length;
    // Add 1 only if this line ends with a newline
    const maxOffset = wrappedLine.endsWithNewline ? lineEnd + 1 : lineEnd;

    return Math.min(startOffsetPlusColumn, maxOffset);
  }

  public getLineLength(line: number): number {
    const currentLine = this.getLine(line);
    const nextLine = this.getLine(line + 1);
    if (nextLine.equals(currentLine)) {
      return this.text.length - currentLine.startOffset;
    }

    return nextLine.startOffset - currentLine.startOffset - 1;
  }

  public getPositionFromOffset(offset: number): Position {
    const lines = this.wrappedLines;
    for (let line = 0; line < lines.length; line++) {
      const currentLine = lines[line]!;
      const nextLine = lines[line + 1];
      if (
        offset >= currentLine.startOffset &&
        (!nextLine || offset < nextLine.startOffset)
      ) {
        const leadingWhitepace = currentLine.isPrecededByNewline
          ? 0
          : currentLine.text.length - currentLine.text.trimStart().length;
        const column = Math.max(
          0,
          Math.min(
            offset - currentLine.startOffset - leadingWhitepace,
            currentLine.text.length,
          ),
        );
        return {
          line,
          column,
        };
      }
    }

    // If we're past the last character, return the end of the last line
    const line = lines.length - 1;
    return {
      line,
      column: this.wrappedLines[line]!.text.length,
    };
  }

  public get lineCount(): number {
    return this.wrappedLines.length;
  }
  equals(other: MeasuredText): boolean {
    return this.text === other.text && this.columns === other.columns;
  }
}
