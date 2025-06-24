import { withTrace } from '@openai/agents';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import createDebug from 'debug';
import { render } from 'ink';
import { homedir } from 'os';
import path from 'path';
import React from 'react';
import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import { Context } from '../context';
import { PluginHookType } from '../plugin';
import { Service } from '../service';
import { setupTracing } from '../tracing';
import { App } from '../ui/app';
import { createStore } from '../ui/store';

React;
const debug = createDebug('takumi:commands:default');

export interface RunOpts {
  prompt: string;
  plan?: boolean;
  context: Context;
  traceFile?: string;
}

export async function run(opts: RunOpts) {
  try {
    let prompt = opts.prompt;
    debug('prompt', prompt);
    const context = opts.context;
    const service = await Service.create({
      agentType: 'code',
      context,
    });
    const planService = await Service.create({
      agentType: 'plan',
      context,
    });
    const store = createStore({
      productName: opts.context.productName,
      version: opts.context.version,
      service,
      planService: planService,
      stage: opts.plan ? 'plan' : 'code',
      traceFile: opts.traceFile,
    });
    const quiet = opts.context.config.quiet;
    if (!quiet) {
      render(<App />, {
        patchConsole: process.env.DEBUG ? false : true,
        exitOnCtrlC: true,
      });
      const exit = () => {
        debug('exit');
        opts.context.destroy().then(() => {
          process.exit(0);
        });
      };
      process.on('SIGINT', exit);
      process.on('SIGQUIT', exit);
      process.on('SIGTERM', exit);
    }
    if (prompt) {
      opts.context.addUserPrompt(prompt);
      const result = await store.actions.query(prompt);
      if (!opts.plan) {
        return result;
      } else {
        return null;
      }
    } else {
      if (quiet) {
        throw new Error(
          'Quiet mode, non interactive, you must provide a prompt to run.',
        );
      }
      return null;
    }
  } finally {
    const quiet = opts.context.config.quiet;
    if (quiet) {
      await opts.context.destroy();
    }
  }
}

export async function runDefault(opts: RunCliOpts) {
  const traceName = `${opts.productName}-default`;
  return await withTrace(traceName, async () => {
    const startTime = Date.now();
    const argv = yargsParser(process.argv.slice(2), {
      alias: {
        model: 'm',
        help: 'h',
        quiet: 'q',
      },
      default: {
        model: 'flash',
      },
      array: ['plugin'],
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
    const cwd = opts.cwd || process.cwd();
    debug('cwd', cwd);
    const context = await Context.create({
      productName: opts.productName,
      version: opts.version,
      cwd,
      argvConfig: {
        model: argv.model,
        smallModel: argv.smallModel,
        planModel: argv.planModel,
        quiet: argv.quiet,
        plugins: argv.plugin,
      },
      plugins: opts.plugins,
    });
    await context.apply({
      hook: 'cliStart',
      args: [],
      type: PluginHookType.Series,
    });
    const result = await run({
      context,
      prompt: argv._[0]! as string,
      plan: argv.plan,
      traceFile,
    });
    await context.apply({
      hook: 'cliEnd',
      args: [
        {
          startTime,
          endTime: Date.now(),
          error: null,
        },
      ],
      type: PluginHookType.Series,
    });
    if (context.config.quiet) {
      console.log(JSON.stringify(result, null, 2));
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
