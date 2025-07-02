import { SlashCommand } from '../types';
import { clearCommand } from './clear';
import { helpCommand } from './help';
import { readFileCommand } from './read-file';
import { testCommand } from './test';

export const builtinCommands: SlashCommand[] = [
  clearCommand,
  helpCommand,
  readFileCommand,
  testCommand,
];

export * from './clear';
export * from './help';
export * from './read-file';
export * from './test';
