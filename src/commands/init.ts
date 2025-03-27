import { Config } from '../config';
import { PRODUCT_NAME } from '../constants/product';
import { getSystemPrompt } from '../constants/prompts';
import { queryWithTools } from '../query';
import { withLogger } from '../tools';

export async function runInit(opts: { config: Config }) {
  const { config } = opts;
  const { model, stream, builtinTools, context } = config;
  // TODO: 这里尝试用新的 tools 调用的方式去做
  // TODO: 也可以做更细化的控制，比如先用 big model 去生成，然后再用 small model 去判断任务是否结束
  await queryWithTools({
    systemPrompt: getSystemPrompt(),
    messages: [{ role: 'user', content: INIT_PROMPT }],
    model,
    stream,
    context,
    tools: withLogger(builtinTools),
  });
}

export const INIT_PROMPT = `
Please analyze this codebase and create a ${PRODUCT_NAME}.md file containing:
1. Build/lint/test commands - especially for running a single test
2. Code style guidelines including imports, formatting, types, naming conventions, error handling, etc.

The file you create will be given to agentic coding agents (such as yourself) that operate in this repository. Make it about 20 lines long.
If there's already a ${PRODUCT_NAME}.md, improve it.
If there are Cursor rules (in .cursor/rules/ or .cursorrules) or Copilot rules (in .github/copilot-instructions.md), make sure to include them.
`;
