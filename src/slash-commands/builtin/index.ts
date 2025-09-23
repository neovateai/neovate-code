import type { SlashCommand } from '../types';
import { clearCommand } from './clear';
import { compactCommand } from './compact';
import { exitCommand } from './exit';
import { helpCommand } from './help';
import { createInitCommand } from './init';
import { createLoginCommand } from './login';
import { createLogoutCommand } from './logout';
import { createMcpCommand } from './mcp';
import { createModelCommand } from './model';
import { createOutputStyleCommand } from './output-style';
import { createResumeCommand } from './resume';
import { createReviewCommand } from './review';
import { statusCommand } from './status';
import { createTerminalSetupCommand } from './terminal-setup';

export function createBuiltinCommands(opts: {
  productName: string;
}): SlashCommand[] {
  return [
    clearCommand,
    exitCommand,
    helpCommand,
    createInitCommand(opts),
    createLoginCommand(),
    createLogoutCommand(),
    createMcpCommand(opts),
    createModelCommand(),
    createOutputStyleCommand(),
    createResumeCommand(),
    createReviewCommand(),
    createTerminalSetupCommand(),
    compactCommand,
    statusCommand,
  ];
}
