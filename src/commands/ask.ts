import { askQuery } from '../llm/query';
import { Context } from '../types';
import * as logger from '../utils/logger';

export async function runAsk(opts: { context: Context; prompt: string }) {
  const { argv } = opts.context;
  let prompt = opts.prompt;
  if (!prompt || prompt.trim() === '') {
    prompt = await logger.getUserInput();
  }
  await askQuery({
    prompt,
    context: opts.context,
  });
  if (!argv.quiet) {
    while (true) {
      const prompt = await logger.getUserInput();
      await askQuery({
        prompt,
        context: opts.context,
      });
    }
  }
}
