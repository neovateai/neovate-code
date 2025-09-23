// @ts-nocheck
import { withTrace } from '@openai/agents';
import { format } from 'date-fns';
import createDebug from 'debug';
import { homedir } from 'os';
import path from 'pathe';
import yargsParser from 'yargs-parser';
import type { RunCliOpts } from '..';
import { Context } from '../context';
import { PluginHookType } from '../plugin';
import { contextPlugin } from '../server/plugins/context';
import { runBrowserServer } from '../server/server';
import { setupTracing } from '../tracing';
import * as logger from '../utils/logger';
import { randomUUID } from '../utils/randomUUID';

const debug = createDebug('neovate:commands:server');

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
  --logLevel <level>            Specify log level
  --port <port>                 Specify port to use

Examples:
  ${p} server "Refactor this file to use hooks."
  ${p} server -m gpt-4o "Add tests for the following code." --port 3000
    `.trim(),
  );
}

export async function runServer(opts: RunCliOpts) {
  const traceName = `${opts.productName}-server`;
  return await withTrace(traceName, async () => {
    const startTime = Date.now();

    const argv = yargsParser(process.argv.slice(2), {
      alias: {
        model: 'm',
        help: 'h',
      },
      default: {},
      boolean: ['help', 'plan'],
      string: ['model', 'smallModel', 'planModel', 'logLevel'],
      number: ['port'],
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

    debug('traceFile', traceFile);

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
      plugins: [contextPlugin, ...(opts.plugins || [])],
      mcp: true,
    });

    logger.logIntro({
      productName: opts.productName,
      version: opts.version,
    });

    logger.logGeneralInfo({
      infos: {
        'Log File': traceFile.replace(homedir(), '~'),
        ...context.generalInfo,
      },
    });

    await context.apply({
      hook: 'cliStart',
      args: [],
      type: PluginHookType.Series,
    });

    await runBrowserServer({
      context,
      prompt: argv._[0]! as string,
      cwd,
      logLevel: argv.logLevel,
      port: argv.port,
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
