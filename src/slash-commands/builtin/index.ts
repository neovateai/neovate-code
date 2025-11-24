import type { SlashCommand } from '../types';
import { createAddDirCommand } from './add-dir';
import { createBugCommand } from './bug';
import { clearCommand } from './clear';
import { compactCommand } from './compact';
import { contextCommand } from './context';
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
import { brainstormCommand } from './spec/brainstorm';
import { executePlanCommand } from './spec/execute-plan';
import { saveDesignCommand } from './spec/save-design';
import { writePlanCommand } from './spec/write-plan';
import { statusCommand } from './status';
import { createTerminalSetupCommand } from './terminal-setup';

export function createBuiltinCommands(opts: {
  productName: string;
  argvConfig: Record<string, any>;
  language: string;
}): SlashCommand[] {
  return [
    clearCommand,
    contextCommand,
    exitCommand,
    helpCommand,
    createInitCommand(opts),
    createLoginCommand(),
    createLogoutCommand(),
    createMcpCommand(opts),
    createModelCommand(opts),
    createOutputStyleCommand(),
    createResumeCommand(),
    createReviewCommand(opts.language),
    createTerminalSetupCommand(),
    createBugCommand(),
    compactCommand,
    statusCommand,
    createAddDirCommand(),
    brainstormCommand(opts.language),
    writePlanCommand(opts.language),
    executePlanCommand(opts.language),
    saveDesignCommand(opts.language),
  ];
}
