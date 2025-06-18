import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import { homedir } from 'os';
import path from 'path';
import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import { runBrowserServer } from '../../server/server';
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
  -q, --quiet                   Quiet mode, non interactive
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

export async function runBrowser(opts: RunCliOpts) {
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      model: 'm',
      help: 'h',
      quiet: 'q',
    },
    default: {
      model: 'flash',
    },
    boolean: ['help', 'plan', 'quiet'],
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

  await runBrowserServer({
    cwd: cwd,
    argvConfig: {
      model: argv.model,
      smallModel: argv.smallModel,
      quiet: argv.quiet,
    },
    productName: opts.productName,
    prompt: argv._[1]! as string,
    plan: argv.plan,
  });
}
