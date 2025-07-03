import { SlashCommand } from '../types';
import { clearCommand } from './clear';
import { exitCommand } from './exit';
import { helpCommand } from './help';

export const builtinCommands: SlashCommand[] = [
  clearCommand,
  exitCommand,
  helpCommand,
];

export * from './clear';
export * from './exit';
export * from './help';
