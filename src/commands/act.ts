import { CoreMessage } from 'ai';
import pc from 'picocolors';
import { MODEL_ALIAS } from '../llms/model';
import { askQuery, editQuery } from '../llms/query';
import { Context } from '../types';
import * as logger from '../v2/utils/logger';

const MAX_PLAN_ITERATIONS = 10;
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

async function plan(opts: {
  context: Context;
  prompt: string;
}): Promise<string | null> {
  const { argv } = opts.context;
  const systemPrompt = [PLAN_PROMPT];
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
      message: `
${pc.bold(pc.blueBright('This is the plan. Do you want to proceed this step by step?'))}
${pc.reset(pc.dim(result))}
      `.trim(),
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
        content: `\nPlease modify the plan.\nHere is my request:\n${modifyPlan}\n          `,
      });
    }
  }
  return result;
}

export async function runAct(opts: { context: Context; prompt: string }) {
  const { argv } = opts.context;

  let prompt = opts.prompt;
  if (!prompt || prompt.trim() === '') {
    prompt = await logger.getUserInput();
  } else {
    logger.logUserInput({ input: prompt });
  }

  if (argv.plan) {
    const planResult = await plan({
      context: opts.context,
      prompt,
    });
    if (planResult) {
      logger.logAction({ message: 'Implement the plan step by step.' });
      prompt = `
Please implement the plan step by step.
Here is the plan:
${planResult}
      `.trim();
    } else {
      logger.logWarn('Plan generation failed or was aborted.');
    }
  }

  await editQuery({
    prompt,
    context: opts.context,
  });

  if (!opts.context.config.quiet) {
    while (true) {
      const prompt = await logger.getUserInput();
      await editQuery({
        prompt,
        context: opts.context,
      });
    }
  }
}
