import assert from 'assert';
import fs from 'fs';
import inquirer from 'inquirer';
import { logInfo } from '../logger';
import { query } from '../query';

const MAX_STEPS = 5;

export async function runPlan(opts: {
  prompt: string;
  maxSteps?: number;
}) {
  assert(opts.prompt, 'Prompt is required');
  let requirements = [opts.prompt];
  let steps = 0;
  const maxSteps = opts.maxSteps || MAX_STEPS;
  while (true) {
    const isComplete = await isRequirementsComplete(requirements);
    logInfo(`> isComplete: ${isComplete}`);
    if (isComplete) {
      break;
    }
    steps++;
    if (steps > maxSteps) {
      break;
    }
    const moreInfo = await askUserForMoreInformation(requirements);
    requirements.push(removeThinkTags(moreInfo));
    logInfo(`> Need more information: \n${removeThinkTags(moreInfo)}`);
    const result = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: 'User: ',
      },
    ]);
    requirements.push(result.input);
  }
  logInfo(`> request for detailed plan`);
  const detailedPlan = await requestDetailedPlan(requirements);
  fs.writeFileSync('Plan.md', removeThinkTags(detailedPlan));
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

export async function requestDetailedPlan(requirements: string[]) {
  const result = await query({
    systemPrompt: [
      `You are a helpful assistant that produces a detailed step by step plan for the user's requirements.`,
    ],
    messages: [
      {
        role: 'user',
        content: `
Requirements:
${requirements.join('\n')}
        `,
      },
    ],
    model: 'Groq/qwen-qwq-32b',
    context: {},
    tools: {},
    stream: false,
  });
  return result.text;
}

export async function askUserForMoreInformation(requirements: string[]) {
  const result = await query({
    systemPrompt: [
      `Don't answer the user's question, just ask the user for more information for better quality answer later.`,
    ],
    messages: [
      {
        role: 'user',
        content: `
Requirements:
${requirements.join('\n')}
        `,
      },
    ],
    model: 'Groq/qwen-qwq-32b',
    context: {},
    tools: {},
    stream: false,
  });
  return result.text;
}

export async function isRequirementsComplete(requirements: string[]) {
  const result = await query({
    systemPrompt: [
      `You are a helpful assistant that checks if the requirements are complete. answer YES or NO.`,
    ],
    messages: [
      {
        role: 'user',
        content: `
Requirements:
${requirements.join('\n')}
        `,
      },
    ],
    model: 'Groq/qwen-qwq-32b',
    context: {},
    tools: {},
    stream: false,
  });
  return result.text.includes('YES');
}
