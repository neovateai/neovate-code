import { askQuery, editQuery } from '../llm/query';
import { Context } from '../types';

export async function runAct(opts: { context: Context; prompt: string }) {
  const { argv } = opts.context;
  if (argv.plan) {
    const result = await askQuery({
      prompt: PLAN_PROMPT,
      context: opts.context,
    });
    console.log(result);
    await editQuery({
      prompt: result,
      context: opts.context,
    });
  } else {
    await editQuery({
      prompt: opts.prompt,
      context: opts.context,
    });
  }
}

const PLAN_PROMPT = `
Act as an expert architect engineer and provide direction to your editor engineer.
Study the change request and the current code.
Describe how to modify the code to complete the request.
The editor engineer will rely solely on your instructions, so make them unambiguous and complete.
Explain all needed code changes clearly and completely, but concisely.
Just show the changes needed.

DO NOT show the entire updated function/file/etc!

Always reply to the user in {language}.
`;
