import type { Context } from '../../context';
import { SlashCommand } from '../types';
import { clearCommand } from './clear';
import { editorCommand } from './editor';
import { exitCommand } from './exit';
import { helpCommand } from './help';
import { createInitCommand } from './init';

export * from './clear';
export * from './exit';
export * from './help';

export function createBuiltinCommands(opts: {
  context: Context;
}): SlashCommand[] {
  return [
    clearCommand,
    exitCommand,
    helpCommand,
    editorCommand,
    createInitCommand(opts),
  ];
}
