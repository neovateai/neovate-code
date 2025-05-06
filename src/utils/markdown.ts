import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import pc from 'picocolors';

let isInitialized = false;

function initializeRenderer() {
  if (isInitialized) return;

  marked.use(
    // @ts-ignore
    markedTerminal(
      {
        code: pc.yellow,
        blockquote: pc.gray,
        heading: pc.bold,
        firstHeading: pc.green,
        link: pc.blue,
        table: pc.cyan,
        emoji: true,
        tableOptions: {
          chars: {
            top: '─',
            'top-mid': '┬',
            'top-left': '┌',
            'top-right': '┐',
            bottom: '─',
            'bottom-mid': '┴',
            'bottom-left': '└',
            'bottom-right': '┘',
            left: '│',
            'left-mid': '├',
            mid: '─',
            'mid-mid': '┼',
            right: '│',
            'right-mid': '┤',
            middle: '│',
          },
        },
      },
      { jsx: true },
    ),
  );
  isInitialized = true;
}

export function renderMarkdown(markdown: string): string {
  initializeRenderer();
  try {
    const rendered = marked.parse(markdown) as string;
    return rendered.trimEnd();
  } catch (error) {
    return markdown;
  }
}

export class StreamRenderer {
  private buffer: string = '';
  private previousRendered: string = '';

  constructor() {
    initializeRenderer();
  }

  append(chunk: string): string {
    this.buffer += chunk;
    try {
      const completeRendered = marked.parse(this.buffer) as string;
      const currentRendered = completeRendered.trimEnd();
      let newContent = '';
      if (currentRendered.startsWith(this.previousRendered)) {
        newContent = currentRendered.substring(this.previousRendered.length);
      } else {
        newContent = currentRendered;
      }
      this.previousRendered = currentRendered;
      return newContent;
    } catch (error) {
      return chunk;
    }
  }
}
