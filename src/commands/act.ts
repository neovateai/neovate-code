import { editQuery } from '../llm/query';
import { Context } from '../types';

export async function runAct(opts: { context: Context; prompt: string }) {
  const { argv } = opts.context;
  if (argv.plan) {
    throw new Error(`Not implemented`);
  } else {
    await editQuery({
      prompt: opts.prompt,
      context: opts.context,
    });
  }
}
