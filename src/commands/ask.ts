import { askQuery } from '../llms/query';
import { Context } from '../types';
import * as logger from '../v2/utils/logger';

export async function runAsk(opts: { context: Context; prompt: string }) {
  const { argv } = opts.context;
  let prompt = opts.prompt;
  if (!prompt || prompt.trim() === '') {
    prompt = await logger.getUserInput();
  } else {
    logger.logUserInput({ input: prompt });
  }
  await askQuery({
    prompt,
    context: opts.context,
  });
  if (!opts.context.config.quiet) {
    while (true) {
      const prompt = await logger.getUserInput();
      await askQuery({
        prompt,
        context: opts.context,
      });
    }
  }
}
