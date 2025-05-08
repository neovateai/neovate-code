import assert from 'assert';
import fs from 'fs';
import inquirer from 'inquirer';
import { askQuery } from '../llms/query';
import { Context } from '../types';
import * as logger from '../utils/logger';

const MAX_STEPS = 5;
const PLAN_FILE = 'PLAN.md';
const REQUIREMENTS_FILE = 'REQUIREMENTS.md';
const DONE_MARK = '!DONE';

function writeRequirementsToFile(requirement: string) {
  const requirements = readRequirementsFromFile();
  requirements.push(requirement);
  fs.writeFileSync(REQUIREMENTS_FILE, requirements.join('\n\n'), 'utf-8');
  logger.logInfo(
    `> Requirements saved to ${REQUIREMENTS_FILE}. You can edit this file directly to modify requirements.`,
  );
}

function readRequirementsFromFile(): string[] {
  if (!fs.existsSync(REQUIREMENTS_FILE)) {
    return [];
  }
  const requirements = fs
    .readFileSync(REQUIREMENTS_FILE, 'utf-8')
    .split('\n')
    .filter(Boolean);
  if (requirements.length > 0) {
    logger.logInfo(
      `> Loaded ${requirements.length} existing requirements from ${REQUIREMENTS_FILE}`,
    );
  }
  return requirements;
}

export async function runPlan(opts: { context: Context }) {
  const { config, argv } = opts.context;
  const prompt = argv._[1] as string;
  const clean = argv.clean;
  assert(prompt, 'Prompt is required');
  if (fs.existsSync(REQUIREMENTS_FILE)) {
    fs.unlinkSync(REQUIREMENTS_FILE);
  }
  let requirements = readRequirementsFromFile();
  requirements.push(prompt);
  writeRequirementsToFile(prompt);
  let steps = 0;
  const maxSteps = clean ? 1 : MAX_STEPS;
  while (true) {
    requirements = readRequirementsFromFile();
    const isComplete = await isRequirementsComplete(requirements, opts.context);
    logger.logInfo(`> isComplete: ${isComplete}`);
    if (isComplete) {
      break;
    }
    steps++;
    if (steps > maxSteps) {
      break;
    }
    const moreInfo = await askUserForMoreInformation(
      requirements,
      opts.context,
    );
    const strippedMoreInfo = removeThinkTags(moreInfo);
    requirements.push(strippedMoreInfo);
    writeRequirementsToFile(strippedMoreInfo);
    logger.logInfo(`> Need more information: \n${strippedMoreInfo}`);
    const result = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: 'User: ',
      },
    ]);
    requirements.push(result.input);
    writeRequirementsToFile(result.input);
  }
  logger.logInfo(`> request for detailed plan`);
  requirements = readRequirementsFromFile();
  const detailedPlan = await requestDetailedPlan(requirements, opts.context);
  fs.writeFileSync(PLAN_FILE, removeThinkTags(detailedPlan));
  logger.logInfo(`> Plan saved to ${PLAN_FILE}`);
}

/**
e.g.
<think>\n aa \n</think>bb > bb
 */
export function removeThinkTags(text: string) {
  const lines = text.split('\n');
  let hasThink = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<think>')) {
      hasThink = true;
    }
    if (line.includes('</think>')) {
      return lines.slice(i + 1).join('\n');
    }
  }
  return text;
}

export async function requestDetailedPlan(
  requirements: string[],
  context: Context,
) {
  const result = await askQuery({
    systemPrompt: [
      `You are a helpful assistant that produces a detailed step by step plan for the user's requirements. In Chinese.`,
    ],
    prompt: `
Requirements:
${requirements.join('\n')}
    `,
    context,
  });
  return result;
}

export async function askUserForMoreInformation(
  requirements: string[],
  context: Context,
) {
  const result = await askQuery({
    systemPrompt: [
      `Don't answer the user's question, just ask the user for more information for better quality answer later. Answer in Chinese.`,
    ],
    prompt: `
Requirements:
${requirements.join('\n')}
    `,
    model: context.config.smallModel,
    context,
  });
  return result;
}

export async function isRequirementsComplete(
  requirements: string[],
  context: Context,
) {
  if (requirements.some((req) => req.includes(DONE_MARK))) {
    return true;
  }
  const result = await askQuery({
    systemPrompt: [
      `You are a helpful assistant that checks if the requirements are complete. answer YES or NO.`,
    ],
    prompt: `
Requirements:
${requirements.join('\n')}
        `,
    model: context.config.smallModel,
    context,
  });
  return result.includes('YES');
}
