import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import { homedir } from 'os';
import path from 'path';
import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import { Context } from '../context';
import { PluginHookType } from '../plugin';
import { runBrowserServer } from '../server/server';
import { setupTracing } from '../tracing';

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
  --plan                        Plan mode
  --logLevel <level>            Specify log level
  --port <port>                 Specify port to use

Examples:
  ${p} server "Refactor this file to use hooks."
  ${p} server -m gpt-4o "Add tests for the following code." --port 3000
    `.trim(),
  );
}

export async function runBrowser(opts: RunCliOpts) {
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      model: 'm',
      help: 'h',
    },
    default: {
      model: 'flash',
    },
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
  const cwd = process.cwd();

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

  await runBrowserServer({
    context,
    prompt: argv._[0]! as string,
    cwd,
    plan: argv.plan,
    logLevel: argv.logLevel,
    port: argv.port,
  });
}
