import { CoreMessage } from 'ai';
import pc from 'picocolors';
import { MODEL_ALIAS } from '../llm/model';
import { askQuery, editQuery } from '../llm/query';
import { Context } from '../types';
import * as logger from '../utils/logger2';

const MAX_PLAN_ITERATIONS = 10;

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
    let iterationCount = 0;
    while (iterationCount < MAX_PLAN_ITERATIONS) {
      iterationCount++;
      result = await askQuery({
        systemPrompt,
        messages,
        context: opts.context,
        model,
      });
      const confirmPlan = await logger.confirm({
        message: `This is the plan. Do you want to proceed this step by step?`,
        active: pc.green('Yes, proceed'),
        inactive: pc.red('No, modify the plan'),
      });
      if (confirmPlan) {
        break;
      } else {
        if (iterationCount === MAX_PLAN_ITERATIONS) {
          logger.logWarn(
            `Maximum plan modification attempts (${MAX_PLAN_ITERATIONS}) reached. Proceeding with current plan.`,
          );
          break;
        }
        // Validate plan modification input
        const modifyPlan = await logger.getUserInput({
          message: `user: (${iterationCount}/${MAX_PLAN_ITERATIONS} attempt)`,
          placeholder: `Your request to modify the plan`,
        });
        messages.push({
          role: 'assistant',
          content: result,
        });
        messages.push({
          role: 'user',
          content: `
Please modify the plan.
Here is my request:
${modifyPlan}
          `,
        });
      }
    }
    logger.logAction({ message: 'Implement the plan step by step.' });
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
