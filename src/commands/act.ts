import { CoreMessage } from 'ai';
import inquirer from 'inquirer';
import pc from 'picocolors';
import { MODEL_ALIAS } from '../llm/model';
import { askQuery, editQuery } from '../llm/query';
import { Context } from '../types';

export async function runAct(opts: { context: Context; prompt: string }) {
  const { argv } = opts.context;

  // Validate initial prompt
  if (!opts.prompt || opts.prompt.trim() === '') {
    console.error(
      pc.red('Error: Empty prompt. Please provide a valid prompt.'),
    );
    return;
  }

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
    const messages: CoreMessage[] = [
      {
        role: 'user',
        content: opts.prompt,
      },
    ];
    let result = null;
    while (true) {
      result = await askQuery({
        systemPrompt,
        messages,
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
        break;
      } else {
        // Validate plan modification input
        let modifyPlan = '';
        while (!modifyPlan || modifyPlan.trim() === '') {
          const response = await inquirer.prompt([
            {
              type: 'input',
              name: 'modifyPlan',
              message: pc.cyan('Please modify the plan, here is my request:'),
              validate: (input) => {
                if (!input || input.trim() === '') {
                  return 'Please provide feedback to modify the plan. Or press Ctrl+C to cancel.';
                }
                return true;
              },
            },
          ]);
          modifyPlan = response.modifyPlan;
        }

        messages.push({
          role: 'assistant',
          content: result,
        });
        messages.push({
          role: 'user',
          content: `
Please modify the plan, here is my request:
${modifyPlan}
          `,
        });
      }
    }
    await editQuery({
      prompt: `
Please implement the plan step by step.

Here is the plan:
${result}
      `,
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

IMPORTANT: DO NOT return <use_tool> with FileWriteTool.
IMPORTANT: DO NOT return <use_tool> with FileEditTool.
IMPORTANT: DO NOT return <use_tool> with BashTool.
`;
