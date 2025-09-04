import { setTraceProcessors } from '@openai/agents';
import assert from 'assert';
import { render } from 'ink';
import React from 'react';
import yargsParser from 'yargs-parser';
import { Context } from './context';
import { DirectTransport } from './messageBus';
import { NodeBridge } from './nodeBridge';
import { Paths } from './paths';
import { type Plugin } from './plugin';
import { Project } from './project';
import { Session, SessionConfigManager, loadSessionMessages } from './session';
import {
  SlashCommandManager,
  isSlashCommand,
  parseSlashCommand,
} from './slashCommand';
import { App } from './ui/App';
import { useAppStore } from './ui/store';
import { UIBridge } from './uiBridge';
import type { UpgradeOptions } from './upgrade';

export type { Plugin, Context };

// ref:
// https://github.com/yargs/yargs-parser/blob/6d69295/lib/index.ts#L19
process.env.YARGS_MIN_NODE_VERSION = '18';

type Argv = {
  _: string[];
  // boolean
  help: boolean;
  mcp: boolean;
  quiet: boolean;
  continue?: boolean;
  // string
  appendSystemPrompt?: string;
  approvalMode?: string;
  cwd?: string;
  language?: string;
  model?: string;
  outputFormat?: string;
  outputStyle?: string;
  planModel?: string;
  resume?: string;
  systemPrompt?: string;
  // array
  plugin: string[];
};

function parseArgs(argv: any) {
  const args = yargsParser(argv, {
    alias: {
      model: 'm',
      help: 'h',
      resume: 'r',
      quiet: 'q',
      continue: 'c',
    },
    default: {
      mcp: true,
    },
    array: ['plugin'],
    boolean: ['help', 'mcp', 'quiet', 'continue'],
    string: [
      'appendSystemPrompt',
      'approvalMode',
      'cwd',
      'language',
      'model',
      'outputFormat',
      'outputStyle',
      'planModel',
      'resume',
      'systemPrompt',
    ],
  }) as Argv;
  if (args.resume && args.continue) {
    throw new Error('Cannot use --resume and --continue at the same time');
  }
  return args;
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
  --cwd <path>                  Specify the working directory
  -r, --resume <session-id>     Resume a session
  -c, --continue                Continue the latest session
  --system-prompt <prompt>      Custom system prompt for code agent
  --output-format <format>      Output format, text, stream-json, json
  --output-style <style>        Output style
  --approval-mode <mode>        Tool approval mode, default, autoEdit, yolo
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

async function runQuiet(argv: Argv, context: Context) {
  try {
    const exit = () => {
      process.exit(0);
    };
    process.on('SIGINT', exit);
    process.on('SIGTERM', exit);
    const prompt = argv._[0];
    assert(prompt, 'Prompt is required in quiet mode');
    let input = String(prompt) as string;
    let model;
    if (isSlashCommand(input)) {
      const parsed = parseSlashCommand(input);
      const slashCommandManager = await SlashCommandManager.create(context);
      const commandEntry = slashCommandManager.get(parsed.command);
      if (commandEntry) {
        const { command } = commandEntry;
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
    let sessionId = argv.resume;
    if (argv.continue) {
      sessionId = context.paths.getLatestSessionId();
    }
    const project = new Project({
      context,
      sessionId,
    });
    await project.send(input, {
      model,
      onToolApprove: () => Promise.resolve(true),
    });
    process.exit(0);
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
}

async function runInteractive(
  argv: Argv,
  contextCreateOpts: any,
  upgrade?: UpgradeOptions,
) {
  const appStore = useAppStore.getState();
  const uiBridge = new UIBridge({
    appStore,
  });
  const nodeBridge = new NodeBridge({
    contextCreateOpts,
  });
  const [uiTransport, nodeTransport] = DirectTransport.createPair();
  uiBridge.messageBus.setTransport(uiTransport);
  nodeBridge.messageBus.setTransport(nodeTransport);

  // Initialize the Zustand store with the UIBridge
  const cwd = argv.cwd || process.cwd();
  const paths = new Paths({
    productName: contextCreateOpts.productName,
    cwd,
  });
  const sessionId = (() => {
    if (argv.resume) {
      return argv.resume;
    }
    if (argv.continue) {
      return paths.getLatestSessionId();
    }
    return Session.createSessionId();
  })();
  const [messages, history] = (() => {
    const logPath = paths.getSessionLogPath(sessionId);
    const messages = loadSessionMessages({ logPath });
    // Get history from session config
    const sessionConfigManager = new SessionConfigManager({ logPath });
    const history = sessionConfigManager.config.history || [];
    return [messages, history];
  })();
  const initialPrompt = String(argv._[0] || '');
  await appStore.initialize({
    bridge: uiBridge,
    cwd,
    initialPrompt,
    sessionId,
    logFile: paths.getSessionLogPath(sessionId),
    // TODO: should move to nodeBridge
    messages,
    history,
    upgrade,
  });

  render(React.createElement(App), {
    patchConsole: true,
    exitOnCtrlC: false,
  });
  const exit = () => {
    process.exit(0);
  };
  process.on('SIGINT', exit);
  process.on('SIGTERM', exit);
}

export async function runNeovate(opts: {
  productName: string;
  productASCIIArt?: string;
  version: string;
  plugins: Plugin[];
  upgrade?: UpgradeOptions;
}) {
  // clear tracing
  setTraceProcessors([]);
  const argv = parseArgs(process.argv.slice(2));
  if (argv.help) {
    printHelp(opts.productName.toLowerCase());
    return;
  }
  const contextCreateOpts = {
    productName: opts.productName,
    productASCIIArt: opts.productASCIIArt,
    version: opts.version,
    argvConfig: {
      model: argv.model,
      planModel: argv.planModel,
      quiet: argv.quiet,
      outputFormat: argv.outputFormat,
      plugins: argv.plugin,
      systemPrompt: argv.systemPrompt,
      appendSystemPrompt: argv.appendSystemPrompt,
      language: argv.language,
      outputStyle: argv.outputStyle,
      approvalMode: argv.approvalMode,
    },
    plugins: opts.plugins,
  };

  // TODO: support other commands
  // sub commands
  const validCommands = ['config', 'commit', 'mcp', 'run', 'log', 'server'];
  const command = argv._[0];
  if (validCommands.includes(command)) {
    const context = await Context.create({
      cwd: argv.cwd || process.cwd(),
      ...contextCreateOpts,
    });
    switch (command) {
      case 'config':
        const { runConfig } = await import('./commands/config');
        await runConfig(context);
        break;
      case 'mcp':
        const { runMCP } = await import('./commands/mcp');
        await runMCP(context);
        break;
      case 'run':
        const { runRun } = await import('./commands/run');
        await runRun(context);
        break;
      case 'commit':
        const { runCommit } = await import('./commands/commit');
        await runCommit(context);
        break;
      default:
        throw new Error(`Unsupported command: ${command}`);
    }
    return;
  }

  if (argv.quiet) {
    const context = await Context.create({
      cwd: argv.cwd || process.cwd(),
      ...contextCreateOpts,
    });
    await runQuiet(argv, context);
  } else {
    let upgrade = opts.upgrade;
    if (process.env.NEOVATE_SELF_UPDATE === 'none') {
      upgrade = undefined;
    }
    if (upgrade && !upgrade.installDir.includes('node_modules')) {
      upgrade = undefined;
    }
    await runInteractive(argv, contextCreateOpts, upgrade);
  }
}
