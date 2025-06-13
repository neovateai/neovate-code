import {
  AgentInputItem,
  FunctionCallItem,
  FunctionCallResultItem,
  MCPServerStdio,
  MCPServerStreamableHttp,
  ModelProvider,
  Runner,
  getAllMcpTools,
  withTrace,
} from '@openai/agents';
import assert from 'assert';
import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import { createCodeAgent } from '../agents/code';
import { Config } from '../config';
import { Context, PromptContext } from '../context';
import { parseMessage } from '../parseMessage';
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

export interface RunOpts {
  prompt: string;
  cwd?: string;
  argvConfig?: Partial<Config>;
  json?: boolean;
  productName?: string;
  modelProvider?: ModelProvider;
}

export async function run(opts: RunOpts) {
  return await withTrace('run', async () => {
    const runner = new Runner({
      modelProvider: opts.modelProvider ?? getDefaultModelProvider(),
      modelSettings: {
        providerData: {
          providerMetadata: {
            google: {
              thinkingConfig: {
                includeThoughts: process.env.THINKING ? true : false,
              },
            },
          },
        },
      },
    });
    const context = new Context({
      cwd: opts.cwd,
      argvConfig: opts.argvConfig,
    });
    const mcpServers = Object.values(
      context.configManager.config.mcpServers,
    ).map((config) => {
      if (config.type === 'stdio' || !config.type) {
        const env = config.env;
        if (env) {
          env.PATH = process.env.PATH || '';
        }
        return new MCPServerStdio({
          command: config.command,
          args: config.args,
          env,
        });
      } else if (config.type === 'sse') {
        return new MCPServerStreamableHttp({
          url: config.url,
        });
      } else {
        throw new Error(`Unknown MCP server type: ${config.type}`);
      }
    });
    await Promise.all(mcpServers.map((server) => server.connect()));
    try {
      const mcpTools = await getAllMcpTools(mcpServers);
      const tools = new Tools([
        createWriteTool({ context }),
        createReadTool({ context }),
        createLSTool({ context }),
        createEditTool({ context }),
        createBashTool({ context }),
        createGlobTool({ context }),
        createGrepTool({ context }),
        createFetchTool({ context }),
        ...mcpTools,
      ]);
      const codeAgent = createCodeAgent({
        model: context.configManager.config.model,
        context,
        tools,
        fc: false,
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

        if (context.configManager.config.stream) {
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
                  break;
              }
            }
          }
          history = [...result.history];
        } else {
          const result = await runner.run(codeAgent, input);
          const reasonItem = result.output.find(
            (item) => item.type === 'reasoning',
          );
          if (reasonItem) {
            if (!opts.json) {
              console.log('Thought: ', reasonItem.content[0].text);
            }
          }
          assert(result.finalOutput, 'No final output');
          text = result.finalOutput;
          history = [...result.history];
        }

        const parsed = parseMessage(text);
        if (parsed[0]?.type === 'text') {
          if (!opts.json && !context.configManager.config.stream) {
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
    } finally {
      await Promise.all(mcpServers.map((server) => server.close()));
    }
  });
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
      stream: argv.stream,
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
