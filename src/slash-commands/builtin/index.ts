import { SlashCommand } from '../types';
import { clearCommand } from './clear';
import { exitCommand } from './exit';
import { helpCommand } from './help';
import { readFileCommand } from './read-file';
import { testCommand } from './test';

export const builtinCommands: SlashCommand[] = [
  clearCommand,
  exitCommand,
  helpCommand,
  readFileCommand,
  testCommand,
];

export * from './clear';
export * from './exit';
export * from './help';
export * from './read-file';
export * from './test';
