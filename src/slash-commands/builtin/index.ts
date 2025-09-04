import { type SlashCommand } from '../types';
import { clearCommand } from './clear';
import { compactCommand } from './compact';
import { exitCommand } from './exit';
import { helpCommand } from './help';
import { createInitCommand } from './init';
import { createMcpCommand } from './mcp';
import { createModelCommand } from './model';
import { createOutputStyleCommand } from './output-style';
import { createResumeCommand } from './resume';
import { createReviewCommand } from './review';
import { statusCommand } from './status';

export * from './clear';
export * from './exit';
export * from './help';
export * from './mcp';

export function createBuiltinCommands(opts: {
  productName: string;
}): SlashCommand[] {
  return [
    clearCommand,
    exitCommand,
    helpCommand,
    createInitCommand(opts),
    createMcpCommand(opts),
    createModelCommand(),
    createOutputStyleCommand(),
    createResumeCommand(),
    createReviewCommand(),
    compactCommand,
    statusCommand,
  ];
}
