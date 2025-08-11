import type { Context } from '../../context';
import { SlashCommand } from '../types';
import { clearCommand } from './clear';
import { compactCommand } from './compact';
import { exitCommand } from './exit';
import { helpCommand } from './help';
import { createInitCommand } from './init';
import { createReviewCommand } from './review';
import { statusCommand } from './status';

export * from './clear';
export * from './exit';
export * from './help';

export async function createBuiltinCommands(opts: {
  context: Context;
}): Promise<SlashCommand[]> {
  const { createModelCommand } = await import('./model');
  return [
    clearCommand,
    exitCommand,
    helpCommand,
    createInitCommand(opts),
    createModelCommand(opts),
    createReviewCommand(),
    compactCommand,
    statusCommand,
  ];
}
