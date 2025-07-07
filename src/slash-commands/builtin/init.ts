import { Context } from '../../context';
import { PromptCommand } from '../types';

export function createInitCommand(opts: { context: Context }) {
  const productName = opts.context.productName;
  return {
    type: 'prompt',
    name: 'init',
    description: `Create ${productName}.md files to customize your interactions with ${productName.toLowerCase()}.`,
    progressMessage: `Analyzing codebase to create ${productName}.md...`,
    async getPromptForCommand() {
      return [
        {
          role: 'user',
          content: `Analyze this codebase and create/improve ${productName}.md with:

## Commands
- Build, lint, test commands
- Single test execution

## Code Style  
- Import organization, formatting, naming
- Error handling patterns

Keep it concise (~20 lines). Include existing .cursorrules or .github/copilot-instructions.md if found.`,
        },
      ];
    },
  } as PromptCommand;
}
