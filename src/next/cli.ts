import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargsParser from 'yargs-parser';
import { PRODUCT_NAME } from '../constants';
import { type Plugin, PluginHookType } from '../plugin';
import { Context } from './context';
import { Project } from './project';
import {
  SlashCommandManager,
  isSlashCommand,
  parseSlashCommand,
} from './slashCommand';

function parseArgs(argv: any) {
  return yargsParser(argv, {
    alias: {
      model: 'm',
      help: 'h',
      resume: 'r',
      quiet: 'q',
    },
    default: {
      mcp: true,
    },
    array: ['plugin'],
    boolean: ['help', 'quiet', 'mcp'],
    string: [
      'resume',
      'model',
      'smallModel',
      'planModel',
      'systemPrompt',
      'appendSystemPrompt',
      'outputStyle',
      'outputFormat',
      'cwd',
    ],
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
  --plan-model <model>          Specify a plan model for some tasks
  --small-model <model>         Specify a smaller model for some tasks
  --cwd <path>                  Specify the working directory
  --resume <session-id>         Resume a session
  --system-prompt <prompt>      Custom system prompt for code agent
  --output-format <format>      Output format, text, stream-json, json
  --output-style <style>        Output style
  -q, --quiet                   Quiet mode, non interactive
  --no-mcp                      Disable MCP servers

Examples:
  ${p} "Refactor this file to use hooks."
  ${p} -m gpt-4o "Add tests for the following code."

Commands:
  config                        Manage configuration
  commit                        Commit changes to the repository
  mcp                           Manage MCP servers
  run                           Run a command
  log                           Start log viewer server
    `.trimEnd(),
  );
}

export async function runNeovate(opts: {
  productName: string;
  version: string;
  plugins: Plugin[];
}) {
  const argv = parseArgs(process.argv.slice(2));
  if (argv.help) {
    printHelp(opts.productName.toLowerCase());
    return;
  }
  const prompt = argv._[0];
  const cwd = argv.cwd || process.cwd();
  const context = await Context.create({
    cwd,
    productName: opts.productName,
    version: opts.version,
    argvConfig: {
      model: argv.model,
      smallModel: argv.smallModel,
      planModel: argv.planModel,
      quiet: argv.quiet,
      outputFormat: argv.outputFormat,
      plugins: argv.plugin,
      systemPrompt: argv.systemPrompt,
      appendSystemPrompt: argv.appendSystemPrompt,
      language: argv.language,
      outputStyle: argv.outputStyle,
    },
    plugins: opts.plugins,
  });
  const project = new Project({
    context,
    sessionId: argv.resume,
  });
  if (argv.quiet) {
    try {
      assert(prompt, 'Prompt is required in quiet mode');
      let input = prompt as string;
      if (isSlashCommand(input)) {
        const parsed = parseSlashCommand(input);
        if (parsed) {
          const pluginSlashCommands = await context.apply({
            hook: 'command',
            args: [],
            type: PluginHookType.SeriesMerge,
          });
          const slashCommandManager = new SlashCommandManager({
            productName: opts.productName,
            paths: context.paths,
            slashCommands: pluginSlashCommands,
          });
          const command = slashCommandManager.get(parsed.command);
          if (command) {
            // TODO: support other slash command types
            if (command.type === 'prompt') {
              const prompt = await command.getPromptForCommand(parsed.args);
              assert(prompt, `Prompt is required for ${parsed.command}`);
              assert(
                prompt.length === 1,
                `Only one prompt is supported for ${parsed.command} in quiet mode`,
              );
              input = prompt?.[0]?.content;
            } else {
              throw new Error(`Unsupported slash command: ${parsed.command}`);
            }
          }
        }
      }
      await project.send(input);
      process.exit(0);
    } catch (e: any) {
      console.error(`Error: ${e.message}`);
      console.error(e.stack);
      process.exit(1);
    }
  } else {
    // Interactive mode
    throw new Error('Interactive mode is not supported yet');
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'),
);
runNeovate({
  productName: PRODUCT_NAME,
  version: pkg.version,
  plugins: [],
}).catch((e) => {
  console.error(e);
});
