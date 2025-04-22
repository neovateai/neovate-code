import { editQuery } from '../llm/query';
import { Context } from '../types';

export async function runInit(opts: { context: Context }) {
  await editQuery({
    prompt: createInitPrompt(opts.context.config.productName),
    context: opts.context,
  });
}

function createInitPrompt(productName: string) {
  return `
Please analyze this codebase and create a ${productName}.md file containing:
1. Build/lint/test commands - especially for running a single test
2. Code style guidelines including imports, formatting, types, naming conventions, error handling, etc.

The file you create will be given to agentic coding agents (such as yourself) that operate in this repository. Make it about 20 lines long.
If there's already a ${productName}.md, improve it.
If there are Cursor rules (in .cursor/rules/ or .cursorrules) or Copilot rules (in .github/copilot-instructions.md), make sure to include them.
`;
}
