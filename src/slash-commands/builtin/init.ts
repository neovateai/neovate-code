import { Context } from '../../context';
import { PromptCommand } from '../types';

export function createInitCommand(opts: { context: Context }) {
  const productName = opts.context.productName;
  return {
    type: 'prompt',
    name: 'init',
    description: `Create ${productName}.md files to customize your interactions with ${productName.toLowerCase()}.`,
    progressMessage: 'Analyzing codebase...',
    async getPromptForCommand() {
      return [
        {
          role: 'user',
          content: `
Please analyze this codebase and create a ${productName}.md file containing:
1. Build/lint/test commands - especially for running a single test
2. Code style guidelines including imports, formatting, types, naming conventions, error handling, etc.

The file you create will be given to agentic coding agents (such as yourself) that operate in this repository. Make it about 20 lines long.
If there's already a ${productName}.md, improve it.
If there are Cursor rules (in .cursor/rules/ or .cursorrules) or Copilot rules (in .github/copilot-instructions.md), make sure to include them.
          `,
        },
      ];
    },
  } as PromptCommand;
}
