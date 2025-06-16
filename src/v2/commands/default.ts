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
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import createDebug from 'debug';
import { homedir } from 'os';
import path from 'path';
import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import { confirm, getUserInput } from '../../utils/logger';
import { createCodeAgent } from '../agents/code';
import { createPlanAgent } from '../agents/plan';
import { Config } from '../config';
import { PRODUCT_NAME } from '../constants';
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
import { setupTracing } from '../tracing';

const debug = createDebug('takumi:commands:default');

export interface RunOpts {
  prompt: string;
  cwd?: string;
  argvConfig?: Partial<Config>;
  json?: boolean;
  productName?: string;
  modelProvider?: ModelProvider;
  plan?: boolean;
}

export async function run(opts: RunOpts) {
  const traceName = `${opts.productName ?? PRODUCT_NAME}-default}`;
  return await withTrace(traceName, async () => {
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
      const readonlyTools = new Tools([
        createReadTool({ context }),
        createLSTool({ context }),
        createGlobTool({ context }),
        createGrepTool({ context }),
        createFetchTool({ context }),
      ]);
      const planAgent = createPlanAgent({
        model: context.configManager.config.planModel,
        context,
        tools: readonlyTools,
        fc: false,
      });
      const allTools = new Tools([
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
        tools: allTools,
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
      if (opts.plan) {
        while (true) {
          const result = await runner.run(planAgent, input);
          const plan = result.finalOutput;
          assert(plan, `No plan found`);
          console.log(`Here is ${context.productName}'s plan:`);
          console.log(plan);
          console.log();
          const confirmed = await confirm({
            message: 'Would you like to proceed?',
            active: 'Yes',
            inactive: 'No, I want to edit the plan',
          });
          if (confirmed) {
            input = [
              {
                role: 'system',
                content: await promptContext.getContext(),
              },
              {
                role: 'user',
                content: plan,
              },
            ];
            break;
          } else {
            const editedPlan = await getUserInput({
              message: 'Please edit the plan:',
            });
            input = [
              ...result.history,
              {
                role: 'user',
                content: editedPlan,
              },
            ];
          }
        }
      }
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
          const result = await allTools.invoke(name, args, context);
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

function printHelp(p: string) {
  console.log(
    `
Usage:
  ${p} [options] [command] <prompt>

Run the code agent with a prompt, interactive by default, use -q/--quiet for non-interactive mode.

Arguments:
  prompt                        Prompt to run

Options:
  -h, --help                    Show help
  -m, --model <model>           Specify model to use
  --smallModel <model>          Specify a smaller model for some tasks
  -q, --quiet                   Quiet mode, non interactive
  --stream                      Stream output (default: true)
  --json                        Output result as JSON
  --plan                        Plan mode

Examples:
  ${p} "Refactor this file to use hooks."
  ${p} -m gpt-4o "Add tests for the following code."

Commands:
  config                        Manage configuration
  commit                        Commit changes to the repository
  mcp                           Manage MCP servers
    `.trim(),
  );
}

export async function runDefault(opts: RunCliOpts) {
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      model: 'm',
      help: 'h',
    },
    default: {
      model: 'flash',
      stream: true,
    },
    boolean: ['stream', 'json', 'help', 'plan'],
    string: ['model', 'smallModel', 'planModel'],
  });
  if (argv.help) {
    printHelp(opts.productName.toLowerCase());
    return;
  }
  const uuid = randomUUID().slice(0, 4);
  const traceFile = path.join(
    homedir(),
    `.${opts.productName.toLowerCase()}`,
    'sessions',
    `${opts.productName}-${format(new Date(), 'yyyy-MM-dd-HHmmss')}-${uuid}.jsonl`,
  );
  setupTracing(traceFile);
  debug('Tracing to', traceFile);
  const cwd = process.cwd();
  const result = await run({
    argvConfig: {
      model: argv.model,
      smallModel: argv.smallModel,
      stream: argv.stream,
      planModel: argv.planModel,
    },
    productName: opts.productName,
    prompt: argv._[0]! as string,
    cwd,
    json: argv.json,
    plan: argv.plan,
  });
  if (argv.json) {
    console.log(JSON.stringify(result.history, null, 2));
  }
}
