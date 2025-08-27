import assert from 'assert';
import fs from 'fs';
import { render } from 'ink';
import path from 'path';
import React from 'react';
import { fileURLToPath } from 'url';
import yargsParser from 'yargs-parser';
import { PRODUCT_NAME } from '../constants';
import { type Plugin, PluginHookType } from '../plugin';
import { clearTracing } from '../tracing';
import { randomUUID } from '../utils/randomUUID';
import { Context } from './context';
import { DirectTransport } from './messageBus';
import { NodeBridge } from './nodeBridge';
import { Paths } from './paths';
import { Project } from './project';
import { loadSessionMessages } from './session';
import {
  SlashCommandManager,
  isSlashCommand,
  parseSlashCommand,
} from './slashCommand';
import { App } from './ui/App';
import { useAppStore } from './ui/store';
import { UIBridge } from './uiBridge';

type Argv = {
  _: string[];
  // boolean
  help: boolean;
  mcp: boolean;
  quiet: boolean;
  // string
  appendSystemPrompt?: boolean;
  cwd?: string;
  language?: string;
  model?: string;
  outputFormat?: string;
  outputStyle?: string;
  planModel?: string;
  resume?: string;
  smallModel?: string;
  systemPrompt?: string;
  // array
  plugin: string[];
};

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
    boolean: ['help', 'mcp', 'quiet'],
    string: [
      'appendSystemPrompt',
      'cwd',
      'language',
      'model',
      'outputFormat',
      'outputStyle',
      'planModel',
      'resume',
      'smallModel',
      'systemPrompt',
    ],
  }) as Argv;
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

async function runInQuietMode(argv: Argv, context: Context) {
  try {
    const prompt = argv._[0];
    assert(prompt, 'Prompt is required in quiet mode');
    let input = prompt as string;
    let model;
    if (isSlashCommand(input)) {
      const parsed = parseSlashCommand(input);
      if (parsed) {
        const pluginSlashCommands = await context.apply({
          hook: 'command',
          args: [],
          type: PluginHookType.SeriesMerge,
        });
        const slashCommandManager = new SlashCommandManager({
          productName: context.productName,
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
            if (command.model) {
              model = command.model;
            }
          } else {
            throw new Error(`Unsupported slash command: ${parsed.command}`);
          }
        }
      }
    }
    const project = new Project({
      context,
      sessionId: argv.resume,
    });
    await project.send(input, { model });
    process.exit(0);
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
}

async function runInInteractiveMode(argv: Argv, contextCreateOpts: any) {
  const uiBridge = new UIBridge();
  const nodeBridge = new NodeBridge({
    contextCreateOpts,
  });
  const [uiTransport, nodeTransport] = DirectTransport.createPair();
  uiBridge.messageBus.setTransport(uiTransport);
  nodeBridge.messageBus.setTransport(nodeTransport);

  // Initialize the Zustand store with the UIBridge
  const cwd = argv.cwd || process.cwd();
  const messages = (() => {
    if (!argv.resume) {
      return [];
    }
    const paths = new Paths({
      productName: contextCreateOpts.productName,
      cwd,
    });
    const logPath = paths.getSessionLogPath(argv.resume);
    return loadSessionMessages({ logPath });
  })();
  await useAppStore.getState().initialize({
    bridge: uiBridge,
    cwd,
    initialPrompt: argv._[0],
    sessionId: argv.resume || randomUUID(),
    messages,
  });

  render(<App />, {
    patchConsole: false,
    exitOnCtrlC: true,
  });
  const exit = () => {
    process.exit(0);
  };
  process.on('SIGINT', exit);
  process.on('SIGTERM', exit);
}

export async function runNeovate(opts: {
  productName: string;
  version: string;
  plugins: Plugin[];
}) {
  clearTracing();
  const argv = parseArgs(process.argv.slice(2));
  if (argv.help) {
    printHelp(opts.productName.toLowerCase());
    return;
  }
  const contextCreateOpts = {
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
  };
  // TODO: support other commands
  if (argv.quiet) {
    const context = await Context.create({
      cwd: argv.cwd || process.cwd(),
      ...contextCreateOpts,
    });
    await runInQuietMode(argv, context);
  } else {
    await runInInteractiveMode(argv, contextCreateOpts);
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
