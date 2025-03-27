#!/usr/bin/env -S node --no-warnings=ExperimentalWarning
import { CoreMessage } from 'ai';
import assert from 'assert';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import yParser from 'yargs-parser';
import { INIT_PROMPT } from './commands/init';
import { runPlan } from './commands/plan';
import { PRODUCT_NAME } from './constants/product';
import { getPlanPrompt, getSystemPrompt } from './constants/prompts';
import { getContext } from './context';
import { logError, logInfo, logPrompt } from './logger';
import { closeClients, createClients, getClientsTools } from './mcp';
import { query } from './query';
import { getTools, withLogger } from './tools';
import inquirer from 'inquirer';

function getCwd() {
  return process.cwd();
}

async function main() {
  dotenv.config();
  const argv = yParser(process.argv.slice(2));

  let disableMCP = false;
  let planMode = false;
  let messages: CoreMessage[] = [];
  const extraSystemPrompts: string[] = [];
  if (argv._.length > 0) {
    let prompt = argv._[0] as string;
    if (argv._[0] === 'plan') {
      logPrompt('/plan');
      await runPlan({
        prompt: argv._[1] as string,
      });
      process.exit(0);
    } else if (argv._[0] === 'init') {
      logPrompt('/init');
      disableMCP = true;
      prompt = INIT_PROMPT;
    } else if (argv._[0] === 'plan(original)') {
      logPrompt('/plan');
      disableMCP = true;
      planMode = true;
      prompt = `
${getPlanPrompt().join('\n')}
${argv._[1]}
      `;
      assert(prompt, 'Prompt is required');
    } else {
      logPrompt(prompt);
    }
    console.log();
    messages = [{ role: 'user', content: prompt }];
  } else {
    logError('No command provided');
    process.exit(1);
  }

  const model = argv.model;
  if (!model) {
    logError('Model is required');
    process.exit(1);
  }
  const stream = (() => {
    if (
      model === 'Google/gemini-2.0-pro-exp-02-05' ||
      model === 'Google/gemini-2.5-pro-exp-03-25'
    ) {
      return false;
    }
    return argv.stream !== 'false';
  })();
  const mcpConfigPath = path.join(
    getCwd(),
    `.${PRODUCT_NAME.toLowerCase()}/mcp.json`,
  );
  const mcpConfig = (() => {
    if (fs.existsSync(mcpConfigPath)) {
      logInfo(
        `Using MCP config from ${path.relative(getCwd(), mcpConfigPath)}`,
      );
      return JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
    } else {
      logInfo(
        `No MCP config found at ${path.relative(getCwd(), mcpConfigPath)}`,
      );
      return {};
    }
  })();

  logInfo(`Using model: ${model}`);
  logInfo(`Using stream: ${stream}`);
  logInfo(
    `Using MCP servers: ${Object.keys(mcpConfig.mcpServers || {}).join(', ')}`,
  );

  const clients = await createClients(mcpConfig.mcpServers || {});
  const tools = withLogger({
    ...(await getTools()),
    ...(await getClientsTools(clients)),
  });
  const context = await getContext();
  try {
    while (true) {
      const result = await query({
        messages,
        context,
        systemPrompt: [
          ...getSystemPrompt(),
          ...extraSystemPrompts,
        ],
        model,
        tools,
        stream,
      });
      let toolCalls: string[] = [];
      for (const step of result.steps) {
        if (step.text.length > 0) {
          messages.push({ role: 'assistant', content: step.text });
        }
        if (step.toolCalls.length > 0) {
          toolCalls.push(
            ...step.toolCalls.map((toolCall) => toolCall.toolName),
          );
          messages.push({ role: 'assistant', content: step.toolCalls });
        }
        if (step.toolResults.length > 0) {
          messages.push({ role: 'tool', content: step.toolResults });
        }
      }
      if (toolCalls.length > 0) {
        // console.log(`Tools called: ${toolCalls.join(', ')}`);
      } else {
        // console.log(`>> result.text: ${result.text}`);
        logInfo(`${result.text}`);
        if (planMode) {
          if (result.text.toUpperCase().includes('DONE')) {
            break;
          } else {
            const input = await inquirer.prompt([
              {
                type: 'input',
                name: 'input',
                message: 'Answer: ',
              },
            ]);
            assert(input, 'Input is required');
            messages.push({ role: 'user', content: input.input });
          }
        } else {
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error in main loop:');
    console.error(error);
  } finally {
    await closeClients(clients);
  }
}

main()
  .catch(console.error)
  .finally(() => {
    process.exit(0);
  });
