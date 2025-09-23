import * as p from '@umijs/clack-prompts';
import { parse, setOptions } from 'marked';
import type { TerminalRendererOptions } from 'marked-terminal';
import TerminalRenderer, { type markedTerminal } from 'marked-terminal';
import pc from 'picocolors';

interface MarkdownRendererConfig {
  options: TerminalRendererOptions;
  parserOptions: Parameters<typeof markedTerminal>[1];
}

const defaultConfig: MarkdownRendererConfig = {
  options: {
    tab: 0,
  },
  parserOptions: {
    jsx: true,
  },
};

function createRenderer(config: MarkdownRendererConfig = defaultConfig) {
  setOptions({
    // @ts-expect-error missing parser, space props
    renderer: new TerminalRenderer(config.options, config.parserOptions),
  });

  return (text: string): string => parse(text, { async: false }).trim();
}

const renderer = createRenderer();
export function renderMarkdown(markdown: string): string {
  try {
    return renderer(markdown);
  } catch (error) {
    console.error('Markdown rendering failed:', error);
    return markdown;
  }
}

interface MarkdownTaskLoggerState {
  lastLinesCount: number;
  parsedText: string;
}

export class MarkdownTaskLogger {
  private state: MarkdownTaskLoggerState;
  private task: ReturnType<typeof p.taskLog>;

  constructor(productName: string) {
    this.state = {
      lastLinesCount: 0,
      parsedText: '',
    };
    this.task = p.taskLog(pc.bold(pc.magentaBright(`${productName}:`)), {
      parser: this.parseText.bind(this),
    });
  }

  private parseText(text: string): string {
    const lines = text.split('\n');
    const currentLineCount = lines.length;
    const lastLine = lines[currentLineCount - 1];

    if (currentLineCount > 1 && currentLineCount > this.state.lastLinesCount) {
      const aboveLines = lines.slice(0, -1).join('\n');
      this.state.lastLinesCount = currentLineCount;
      this.state.parsedText = renderMarkdown(aboveLines) + '\n';
    }

    return this.state.parsedText + lastLine;
  }

  public updateText(text: string): void {
    this.task.text = text;
  }
}
