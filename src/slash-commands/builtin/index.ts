import { SlashCommand } from '../types';
import { clearCommand } from './clear';
import { editorCommand } from './editor';
import { exitCommand } from './exit';
import { helpCommand } from './help';

export const builtinCommands: SlashCommand[] = [
  clearCommand,
  exitCommand,
  helpCommand,
  editorCommand,
];

export * from './clear';
export * from './exit';
export * from './help';
