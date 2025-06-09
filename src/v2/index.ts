import {
  AgentInputItem,
  FunctionCallItem,
  FunctionCallResultItem,
  ModelProvider,
  Runner,
} from '@openai/agents';
import assert from 'assert';
import yargsParser from 'yargs-parser';
import { createCodeAgent } from './agents/coder';
import { Context } from './context';
import { parseMessage } from './parseMessage';
import { getDefaultModelProvider } from './provider';
import { Tools } from './tool';
import { createLSTool } from './tools/ls';
import { createReadTool } from './tools/read';
import { createWriteTool } from './tools/write';

export interface RunOpts {
  model: string;
  prompt: string;
  stream?: boolean;
  cwd?: string;
  json?: boolean;
  modelProvider?: ModelProvider;
}

export async function run(opts: RunOpts) {
  const runner = new Runner({
    modelProvider: opts.modelProvider ?? getDefaultModelProvider(),
    modelSettings: {
      providerData: {
        // TODO: make this work
        // providerOptions: {
        //   google: {
        //     thinkingConfig: {
        //       includeThoughts: true,
        //     },
        //   },
        // },
      },
    },
  });
  const context = new Context({
    cwd: opts.cwd ?? process.cwd(),
  });
  const tools = new Tools([
    createWriteTool({ context }),
    createReadTool({ context }),
    createLSTool({ context }),
  ]);
  const codeAgent = createCodeAgent({
    model: opts.model,
    context,
    tools,
  });
  let input: AgentInputItem[] = [
    {
      role: 'system',
      content: context.getContextPrompt(),
    },
    {
      role: 'user',
      content: opts.prompt,
    },
  ];
  let finalOutput: string | null = null;
  while (true) {
    let history: AgentInputItem[] = [];
    let text = '';

    if (opts.stream) {
      const result = await runner.run(codeAgent, input, {
        stream: true,
      });
      for await (const chunk of result.toStream()) {
        if (
          chunk.type === 'raw_model_stream_event' &&
          chunk.data.type === 'model'
        ) {
          switch (chunk.data.event.type) {
            case 'text-delta':
              const textDelta = chunk.data.event.textDelta;
              text += textDelta;
              const parsed = parseMessage(text);
              if (parsed[0]?.type === 'text' && parsed[0].partial) {
                if (!opts.json) {
                  process.stdout.write(textDelta);
                }
              }
              break;
            case 'reasoning':
              console.log('====================REASONING====================');
              console.log(chunk.data.event);
              break;
          }
        }
      }
      history = [...result.history];
    } else {
      const result = await runner.run(codeAgent, input);
      assert(result.finalOutput, 'No final output');
      text = result.finalOutput;
      history = [...result.history];
    }

    const parsed = parseMessage(text);
    if (parsed[0]?.type === 'text') {
      if (!opts.json) {
        console.log(parsed[0].content);
      }
    }
    const toolUse = parsed.find((item) => item.type === 'tool_use');
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
      input = history;
      finalOutput = text;
      break;
    }
  }
  return {
    history: input,
    finalOutput,
  };
}

export async function runCli() {
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      model: 'm',
    },
    default: {
      model: 'flash',
      stream: true,
    },
    boolean: ['stream', 'json'],
    string: ['model'],
  });
  const result = await run({
    model: argv.model,
    stream: argv.stream,
    prompt: argv._[0]! as string,
    cwd: process.cwd(),
    json: argv.json,
  });
  if (argv.json) {
    console.log(JSON.stringify(result.history, null, 2));
  }
}
