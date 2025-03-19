#!/usr/bin/env -S node --no-warnings=ExperimentalWarning

import { CoreMessage } from 'ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import yParser from 'yargs-parser';
import { INIT_PROMPT } from './commands/init';
import { PRODUCT_NAME } from './constants/product';
import { getSystemPrompt } from './constants/prompts';
import { getContext } from './context';
import { closeClients, createClients, getClientsTools } from './mcp';
import { query } from './query';
import { test } from './test';
import { getTools } from './tools';

function getCwd() {
  return process.cwd();
}

async function main() {
  dotenv.config();
  const argv = yParser(process.argv.slice(2));
  console.log(argv);

  // for test
  if (argv._[0] === 'test') {
    await test(argv);
    return;
  }

  let messages: CoreMessage[] = [];
  if (argv._.length > 0) {
    let content = argv._[0] as string;
    if (argv._[0] === 'init') {
      content = INIT_PROMPT;
    }
    messages = [{ role: 'user', content }];
  } else {
    throw new Error('No command provided');
  }

  /**
   * Models that worked:
   * - Groq/qwen-qwq-32b
   * - Groq/deepseek-r1-distill-llama-70b
   * - DeepSeek/deepseek-chat
   * - Vscode/claude-3.5-sonnet
   * - Doubao/ep-20250210151255-r5x5s (DeepSeek-Chat)
   * - Doubao/ep-20250210151757-wvgcj (DeepSeek-Reasoner)
   * - Google/gemini-2.0-flash-001 (don't work???)
   * - Google/gemini-2.0-pro-exp-02-05 (don't support stream)
   * - OpenRouter/anthropic/claude-3.5-sonnet
   */
  const model = argv.model || 'Doubao/ep-20250210151255-r5x5s';
  let stream = true;
  // @ts-ignore
  if (model === 'Google/gemini-2.0-pro-exp-02-05') {
    stream = false;
  }
  const mcpConfigPath = path.join(
    getCwd(),
    `.${PRODUCT_NAME.toLowerCase()}/mcp.json`,
  );
  console.log('mcpConfigPath', mcpConfigPath);
  const mcpConfig = (() => {
    if (fs.existsSync(mcpConfigPath)) {
      console.log(`Using MCP config from ${mcpConfigPath}`);
      return JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
    } else {
      console.log(`No MCP config found at ${mcpConfigPath}`);
      return {};
    }
  })();
  console.log('mcpConfig.mcpServers', mcpConfig.mcpServers);
  const clients = await createClients(mcpConfig.mcpServers || {});

  try {
    while (true) {
      const tools = {
        ...(await getTools()),
        ...(await getClientsTools(clients)),
      };
      const context = await getContext();
      const result = await query({
        messages,
        context,
        systemPrompt: getSystemPrompt(),
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
          // // TODO: fix this upstream. for some reason, the tool does not include the type,
          // // against the spec.
          // for (const toolResult of step.toolResults) {
          //   // @ts-ignore
          //   if (!toolResult.type) {
          //     // @ts-ignore
          //     toolResult.type = 'tool-result';
          //   }
          // }
          messages.push({ role: 'tool', content: step.toolResults });
        }
      }
      if (toolCalls.length > 0) {
        console.log(`Tools called: ${toolCalls.join(', ')}`);
      } else {
        console.log(`>> result.text: ${result.text}`);
        break;
      }
    }
  } catch (error) {
    console.error('Error in main loop:');
    console.error(error);
  } finally {
    await closeClients(clients);
    console.log('Closed clients');
  }
}

main()
  .catch(console.error)
  .finally(() => {
    process.exit(0);
  });
