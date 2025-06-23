import { AgentInputItem, ModelProvider, Runner } from '@openai/agents';
import readline from 'readline/promises';
import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import { createCodeAgent } from '../agents/code';
import { Config } from '../config';
import { Context, createContext } from '../context';
import { PromptContext } from '../prompt-context';
import { getDefaultModelProvider } from '../provider';
import { Tools } from '../tool';
import { createBashTool } from '../tools/bash';
import { createEditTool } from '../tools/edit';
import { createFetchTool } from '../tools/fetch';
import { createGlobTool } from '../tools/glob';
import { createGrepTool } from '../tools/grep';
import { createLSTool } from '../tools/ls';
import { createReadTool } from '../tools/read';
import { createWriteTool } from '../tools/write';
import { parseMessage } from '../utils/parse-message';

export interface RunOpts {
  prompt: string;
  cwd: string;
  argvConfig?: Partial<Config>;
  json?: boolean;
  productName?: string;
  modelProvider?: ModelProvider;
}

export async function run(opts: RunOpts) {
  const runner = new Runner({
    modelProvider: opts.modelProvider ?? getDefaultModelProvider(),
    modelSettings: {
      providerData: {
        providerMetadata: {
          google: {
            thinkingConfig: {
              includeThoughts: true,
            },
          },
        },
      },
    },
  });
  const context = await createContext({
    cwd: opts.cwd,
    argvConfig: opts.argvConfig,
  });
  const tools = new Tools([
    createWriteTool({ context }),
    createReadTool({ context }),
    createLSTool({ context }),
    createEditTool({ context }),
    createBashTool({ context }),
    createGlobTool({ context }),
    createGrepTool({ context }),
    createFetchTool({ context }),
  ]);
  const codeAgent = createCodeAgent({
    model: context.config.model,
    context,
    tools,
  });
  const promptContext = new PromptContext({
    prompts: [opts.prompt],
    context,
  });
  let input: AgentInputItem[] = [
    {
      role: 'system',
      content: await promptContext.getContext(),
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

    const result = await runner.run(codeAgent, input, {
      stream: true,
    });
    let printReasoning = false;
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
            if (!printReasoning) {
              if (!opts.json) {
                process.stdout.write('Thought: ');
              }
              printReasoning = true;
            }
            if (!opts.json) {
              process.stdout.write(chunk.data.event.textDelta);
            }
            break;
          default:
            // console.log('----', chunk.data.event);
            break;
        }
      }
    }
    history = [...result.history];

    // TODO: support interactive mode
    input = history;
    finalOutput = text;
    break;
  }
  return {
    history: input,
    finalOutput,
  };
}

export async function runDefault(opts: RunCliOpts) {
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      model: 'm',
    },
    default: {
      model: 'flash',
      stream: true,
    },
    boolean: ['stream', 'json'],
    string: ['model', 'smallModel'],
  });
  const cwd = process.cwd();
  const result = await run({
    argvConfig: {
      model: argv.model,
      smallModel: argv.smallModel,
    },
    productName: opts.productName,
    prompt: argv._[0]! as string,
    cwd,
    json: argv.json,
  });
  if (argv.json) {
    console.log(JSON.stringify(result.history, null, 2));
  }
}

async function confirm(question: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await rl.question(`${question} (y/n): `);
  const normalizedAnswer = answer.toLowerCase();
  rl.close();
  return normalizedAnswer === 'y' || normalizedAnswer === 'yes';
}
