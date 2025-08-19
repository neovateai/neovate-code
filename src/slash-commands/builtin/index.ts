import type { Context } from '../../context';
import { type SlashCommand } from '../types';
import { clearCommand } from './clear';
import { compactCommand } from './compact';
import { exitCommand } from './exit';
import { helpCommand } from './help';
import { createInitCommand } from './init';
import { createMcpCommand } from './mcp';
import { createReviewCommand } from './review';
import { statusCommand } from './status';

export * from './clear';
export * from './exit';
export * from './help';
export * from './mcp';

export async function createBuiltinCommands(opts: {
  context: Context;
}): Promise<SlashCommand[]> {
  const { createModelCommand } = await import('./model');
  const { createOutputStyleCommand } = await import('./output-style');
  return [
    clearCommand,
    exitCommand,
    helpCommand,
    createInitCommand(opts),
    createMcpCommand(opts),
    createModelCommand(opts),
    createOutputStyleCommand(),
    createReviewCommand(),
    compactCommand,
    statusCommand,
  ];
}
