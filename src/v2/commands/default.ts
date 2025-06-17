import { AgentInputItem, ModelProvider, withTrace } from '@openai/agents';
import assert from 'assert';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import createDebug from 'debug';
import { homedir } from 'os';
import path from 'path';
import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import { confirm, getUserInput } from '../../utils/logger';
import { Config } from '../config';
import { PRODUCT_NAME } from '../constants';
import { Context } from '../context';
import { isReasoningModel } from '../provider';
import { query } from '../query';
import { Service } from '../service';
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
  const services: Service[] = [];
  return await withTrace(traceName, async () => {
    try {
      let prompt =
        opts.prompt ||
        (await getUserInput({
          message: 'User:',
        }));
      debug('prompt', prompt);
      const context = new Context({
        productName: opts.productName,
        cwd: opts.cwd,
        argvConfig: opts.argvConfig,
      });
      const commonServiceOpts = {
        cwd: opts.cwd,
        context,
        modelProvider: opts.modelProvider,
      };

      // plan mode
      if (opts.plan) {
        debug('plan mode');
        const service = new Service({
          agentType: 'plan',
          ...commonServiceOpts,
        });
        services.push(service);
        let input: AgentInputItem[] = [
          {
            role: 'user' as const,
            content: prompt,
          },
        ];
        while (true) {
          debug('querying plan', input);
          console.log(`Here is ${service.context.productName}'s plan:`);
          console.log('-------------');
          let isThinking = false;
          const { finalText: plan } = await query({
            input,
            service,
            thinking: isReasoningModel(
              service.context.configManager.config.planModel,
            ),
            onTextDelta(text) {
              process.stdout.write(text);
            },
            onText() {
              process.stdout.write('\n');
            },
            onReasoning(text) {
              if (!isThinking) {
                isThinking = true;
                process.stdout.write('\nThinking:\n');
              }
              process.stdout.write(text);
            },
          });
          debug('plan', plan);
          assert(plan, `No plan found`);
          console.log('-------------');
          const confirmed = await confirm({
            message: 'Would you like to proceed?',
            active: 'Yes',
            inactive: 'No, I want to edit the plan',
          });
          if (confirmed) {
            debug('user confirmed');
            prompt = plan;
            break;
          } else {
            const editedPlan = await getUserInput({
              message: 'Please edit the plan:',
            });
            debug('editedPlan', editedPlan);
            input = [
              {
                role: 'user' as const,
                content: editedPlan,
              },
            ];
          }
        }
      }

      // code mode
      debug('code mode');
      const service = new Service({
        agentType: 'code',
        ...commonServiceOpts,
      });
      services.push(service);
      let input: AgentInputItem[] = [
        {
          role: 'user' as const,
          content: prompt,
        },
      ];
      let finalResult: any;
      while (true) {
        debug('querying code', input);
        let isThinking = false;
        const result = await query({
          input,
          service,
          thinking: isReasoningModel(
            service.context.configManager.config.model,
          ),
          onTextDelta(text) {
            process.stdout.write(text);
          },
          onText(text) {
            process.stdout.write('\n');
            debug('onText', text);
          },
          onReasoning(text) {
            if (!isThinking) {
              isThinking = true;
              process.stdout.write('\nThinking:\n');
            }
            process.stdout.write(text);
            debug('onReasoning', text);
          },
        });
        debug('query result', result.finalText);
        if (context.configManager.config.quiet) {
          finalResult = result;
          debug('quiet mode, break');
          break;
        } else {
          const userInput = await getUserInput({
            message: 'User:',
          });
          input = [
            {
              role: 'user' as const,
              content: userInput,
            },
          ];
          debug('new input', input);
        }
      }
      return finalResult;
    } finally {
      await Promise.all(services.map((service) => service.destroy()));
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
      quiet: 'q',
    },
    default: {
      model: 'flash',
    },
    boolean: ['json', 'help', 'plan', 'quiet'],
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
  const cwd = process.cwd();
  const result = await run({
    argvConfig: {
      model: argv.model,
      smallModel: argv.smallModel,
      planModel: argv.planModel,
      quiet: argv.quiet,
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
