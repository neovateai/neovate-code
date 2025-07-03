import { withTrace } from '@openai/agents';
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
import { APP_STAGE, AppProvider } from '../ui/AppContext';
import { App } from '../ui/app';
import { randomUUID } from '../utils/randomUUID';
import { readStdin } from '../utils/readStdin';

const debug = createDebug('takumi:commands:default');

export interface RunOpts {
  prompt: string;
  plan?: boolean;
  context: Context;
}

async function runInQuiet(opts: RunOpts) {
  try {
    let prompt = opts.prompt;
    if (!prompt) {
      const stdin = (await readStdin()).trim();
      if (stdin) {
        prompt = stdin;
      }
    }
    if (!prompt) {
      throw new Error(
        'Quiet mode, non interactive, you must provide a prompt to run.',
      );
    }
    debug('prompt', prompt);
    const context = opts.context;
    const service = await Service.create({
      agentType: 'code',
      context,
    });
    const { query } = await import('../query');
    const { isReasoningModel } = await import('../provider');
    const result = await query({
      input: [{ role: 'user', content: prompt }],
      service,
      thinking: isReasoningModel(service.context.config.model),
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
  } finally {
    await opts.context.destroy();
  }
}

export async function run(opts: RunOpts) {
  const quiet = opts.context.config.quiet || !process.stdin.isTTY;
  if (quiet) {
    await runInQuiet(opts);
    return;
  }
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
    if (!quiet) {
      render(
        <AppProvider
          context={context}
          service={service}
          planService={planService}
          stage={opts.plan ? APP_STAGE.PLAN : APP_STAGE.CODE}
          initialPrompt={prompt}
        >
          <App />
        </AppProvider>,
        {
          patchConsole: process.env.DEBUG ? false : true,
          exitOnCtrlC: true,
        },
      );
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
  } catch (e) {}
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
      default: {},
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
      traceFile,
    });
    await context.apply({
      hook: 'cliStart',
      args: [],
      type: PluginHookType.Series,
    });
    await run({
      context,
      prompt: argv._[0]! as string,
      plan: argv.plan,
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
  run                           Run a command
  server (experimental)         Start a server, run in browser mode
    `.trim(),
  );
}
