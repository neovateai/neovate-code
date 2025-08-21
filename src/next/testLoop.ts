import yargsParser from 'yargs-parser';
import { PRODUCT_NAME } from '../constants';
import type { Context } from '../context';
import { Tools } from '../tool';
import { createBashTool } from '../tools/bash';
import { createReadTool } from '../tools/read';
import { createWriteTool } from '../tools/write';
import { runLoop } from './loop';
import { modelAlias, providers, resolveModel } from './model';
import { generateSystemPrompt } from './systemPrompt';

function logMessage(role: 'user' | 'assistant', message: string | any) {
  console.log(
    JSON.stringify({
      role,
      message,
    }),
  );
}

async function testLoop() {
  // @ts-ignore
  const context: Context = {
    cwd: process.cwd(),
    productName: PRODUCT_NAME,
  };
  const tools = new Tools([
    createBashTool({
      context,
    }),
    createReadTool({ context }),
    createWriteTool({ context }),
  ]);

  const args = yargsParser(process.argv.slice(2), {
    alias: {
      model: 'm',
    },
  });
  const model = args.model || 'iflow/q3-coder';
  const input = (args._[0] as string | null) || 'create a.txt with foooo';
  logMessage('user', input);
  const result = await runLoop({
    input,
    model: resolveModel(model, providers, modelAlias),
    tools,
    systemPrompt: generateSystemPrompt({
      todo: false,
      productName: PRODUCT_NAME,
    }),
    onTextDelta: async (text) => {
      // console.log('Text delta:', text);
      // write to stdout
      // process.stdout.write(text);
    },
    onText: async (text) => {
      logMessage('assistant', {
        type: 'text',
        text,
      });
    },
    onReasoning: async (text) => {
      console.log('Reasoning:', text);
    },
    onToolUse: async (toolUse) => {
      logMessage('assistant', {
        type: 'tool_use',
        name: toolUse.name,
        input: toolUse.params,
        id: toolUse.callId,
      });
    },
    onToolUseResult: async (toolUseResult) => {
      logMessage('user', {
        type: 'tool_result',
        content: toolUseResult.result,
        tool_use_id: toolUseResult.toolUse.callId,
      });
    },
  });

  console.log('Result:', result);
}

testLoop()
  .then(() => {
    process.exit(0);
  })
  .catch(console.error);
