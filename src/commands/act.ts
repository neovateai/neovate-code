import { editQuery } from '../query2';
import { Context } from '../types';

export async function runAct(opts: { context: Context; prompt: string }) {
  await editQuery({
    prompt: opts.prompt,
    context: opts.context,
  });
}
