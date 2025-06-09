import {
  AgentInputItem,
  FunctionCallItem,
  FunctionCallResultItem,
  Runner,
} from '@openai/agents';
import assert from 'assert';
import yargsParser from 'yargs-parser';
import { createCodeAgent } from './agents/code';
import { Context } from './context';
import { parseMessage } from './parseMessage';
import { getDefaultModelProvider } from './provider';
import { Tools } from './tool';
import { createWriteTool } from './tools/write';

export async function runCli() {
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      model: 'm',
    },
    string: ['model'],
  });
  const modelProvider = getDefaultModelProvider();
  const runner = new Runner({
    modelProvider,
  });
  const context = new Context({
    cwd: process.cwd(),
  });
  const tools = new Tools([createWriteTool({ context })]);
  const codeAgent = createCodeAgent({
    model: argv.model || 'flash',
    context,
    tools,
  });
  let input: AgentInputItem[] = [
    {
      role: 'system',
      content: `
====
Contexts:
- cwd: ${context.cwd}
      `.trim(),
    },
    {
      role: 'user',
      content: argv._[0]! as string,
    },
  ];
  while (true) {
    const result = await runner.run(codeAgent, input);
    assert(result.finalOutput, 'No final output');
    const parsed = parseMessage(result.finalOutput);
    if (parsed[0]?.type === 'text') {
      console.log(parsed[0].content);
    }
    const toolUse = parsed.find((item) => item.type === 'tool_use');
    const history = [...result.history];
    if (toolUse) {
      const name = toolUse.name;
      const args = JSON.stringify(toolUse.params);
      const callId = crypto.randomUUID();
      history.push({
        type: 'function_call',
        name,
        arguments: args,
        callId,
      } as FunctionCallItem);
      const result = await tools.invoke(name, args, context);
      history.push({
        type: 'function_call_result',
        name,
        output: {
          type: 'text',
          text: result,
        },
        status: 'completed',
        callId,
      } as FunctionCallResultItem);
      input = history;
    } else {
      console.log(JSON.stringify(history, null, 2));
      break;
    }
  }
}
