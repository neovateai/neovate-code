import inquirer from 'inquirer';
import pc from 'picocolors';
import { MODEL_ALIAS } from '../llm/model';
import { askQuery, editQuery } from '../llm/query';
import { Context } from '../types';

export async function runAct(opts: { context: Context; prompt: string }) {
  const { argv } = opts.context;
  if (argv.plan) {
    const systemPrompt = [
      // ...opts.context.config.systemPrompt,
      PLAN_PROMPT,
    ];
    const model = (() => {
      if (!argv.planModel) return undefined;
      const alias = MODEL_ALIAS[argv.planModel as keyof typeof MODEL_ALIAS];
      return alias || argv.planModel;
    })();
    const result = await askQuery({
      systemPrompt,
      prompt: opts.prompt,
      context: opts.context,
      model,
    });
    console.log();
    console.log(pc.cyan('Here is the Plan.\n===='));
    console.log(result);
    console.log();

    // Confirm with user before proceeding
    const { confirmPlan } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmPlan',
        message: pc.cyan('Do you want to proceed with this plan?'),
        default: true,
      },
    ]);

    if (confirmPlan) {
      await editQuery({
        prompt: result,
        context: opts.context,
      });
    } else {
      console.log(pc.yellow('Plan execution cancelled.'));
    }
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

IMPORTANT: DO NOT return <use_tool> with FileWriteTool.
IMPORTANT: DO NOT return <use_tool> with FileEditTool.
IMPORTANT: DO NOT return <use_tool> with BashTool.
`;
