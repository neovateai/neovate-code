import { ModelProvider, withTrace } from '@openai/agents';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import createDebug from 'debug';
import { render } from 'ink';
import { homedir } from 'os';
import path from 'path';
import React from 'react';
import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import { PRODUCT_NAME } from '../constants';
import { Context } from '../context';
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
      let prompt = opts.prompt;
      debug('prompt', prompt);
      const commonServiceOpts = {
        cwd: opts.cwd,
        context: opts.context,
        modelProvider: opts.modelProvider,
      };
      const service = new Service({
        agentType: 'code',
        ...commonServiceOpts,
      });
      services.push(service);
      const planService = new Service({
        agentType: 'plan',
        ...commonServiceOpts,
      });
      services.push(planService);
      const store = createStore({
        productName: opts.productName ?? PRODUCT_NAME,
        version: opts.version ?? '0.0.0',
        service,
        planService: planService,
        stage: opts.plan ? 'plan' : 'code',
      });
      if (!opts.context.configManager.config.quiet) {
        render(<App />, {
          patchConsole: process.env.DEBUG ? false : true,
          exitOnCtrlC: true,
        });
      }
      if (prompt) {
        const result = await store.actions.query(prompt);
        if (!opts.plan) {
          return result;
        } else {
          return null;
        }
      } else {
        return null;
      }
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
