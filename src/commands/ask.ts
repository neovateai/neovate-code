import { askQuery } from '../llm/query';
import { Context } from '../types';

export async function runAsk(opts: { context: Context; prompt: string }) {
  const result = await askQuery({
    prompt: opts.prompt,
    context: opts.context,
  });

  return result;
}
