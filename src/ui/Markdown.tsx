import chalk from 'chalk';
import { Text } from 'ink';
import { parse, setOptions } from 'marked';
import TerminalRenderer, {
  type TerminalRendererOptions,
} from 'marked-terminal';
import React from 'react';

export type Props = TerminalRendererOptions & {
  children: string;
};

export function Markdown({ children, ...options }: Props) {
  const opts: TerminalRendererOptions = {
    blockquote: chalk.dim.italic,
    hr: () => '---',
    codespan: chalk.blue,
    firstHeading: (str: string) => {
      const text = str.replace(/^#+ /, '');
      return chalk.bold.italic.underline(text);
    },
    heading: (str: string) => {
      const level = str.match(/^#+ /)?.[0]?.length ?? 0;
      const text = str.replace(/^#+ /, '');
      switch (level) {
        case 1:
          return chalk.bold.italic.underline(text);
        case 2:
          return chalk.bold(text);
        default:
          return chalk.bold.dim(text);
      }
    },
    ...options,
  };
  // @ts-expect-error
  setOptions({ renderer: new TerminalRenderer(opts) });
  return <Text>{(parse(children) as string).trim()}</Text>;
}
