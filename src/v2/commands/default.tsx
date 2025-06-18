import { AgentInputItem, ModelProvider, withTrace } from '@openai/agents';
import assert from 'assert';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import createDebug from 'debug';
import { render } from 'ink';
import { homedir } from 'os';
import path from 'path';
import React from 'react';
import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import { confirm, getUserInput } from '../../utils/logger';
import { PRODUCT_NAME } from '../constants';
import { Context } from '../context';
import { isReasoningModel } from '../provider';
import { query } from '../query';
import { Service } from '../service';
import { setupTracing } from '../tracing';
import { App } from '../ui/app';
import { createStore } from '../ui/store';

React;
const debug = createDebug('takumi:commands:default');

export interface RunOpts {
  prompt: string;
  cwd?: string;
  productName?: string;
  version?: string;
  modelProvider?: ModelProvider;
  plan?: boolean;
  context: Context;
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
      const commonServiceOpts = {
        cwd: opts.cwd,
        context: opts.context,
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
            onToolUse(callId, name, params) {
              console.log(
                `Tool use: ${name} with params ${JSON.stringify(params)}`,
              );
            },
            onToolUseResult(callId, name, result) {
              console.log(
                `Tool use result: ${name} with result ${JSON.stringify(
                  result,
                )}`,
              );
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
      const store = createStore({
        productName: opts.productName ?? PRODUCT_NAME,
        version: opts.version ?? '0.0.0',
        service,
        messages: [],
      });
      if (!opts.context.configManager.config.quiet) {
        render(<App />, {
          patchConsole: process.env.DEBUG ? false : true,
          exitOnCtrlC: true,
        });
      }
      return await store.actions.query(prompt);
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
  const context = new Context({
    productName: opts.productName,
    cwd,
    argvConfig: {
      model: argv.model,
      smallModel: argv.smallModel,
      planModel: argv.planModel,
      quiet: argv.quiet,
    },
  });
  const result = await run({
    context,
    productName: opts.productName,
    version: opts.version,
    prompt: argv._[0]! as string,
    cwd,
    plan: argv.plan,
  });
  if (context.configManager.config.quiet) {
    console.log(JSON.stringify(result, null, 2));
  }
}
