import assert from 'assert';
import { render } from 'ink';
import React from 'react';
import { runTest } from './commands/__test';
import { runServer } from './commands/server/server';
import { Context } from './context';
import { GlobalData } from './globalData';
import { parseMcpConfig } from './mcp';
import { DirectTransport } from './messageBus';
import { NodeBridge } from './nodeBridge';
import { Paths } from './paths';
import { type Plugin, PluginHookType } from './plugin';
import { Project } from './project';
import { loadSessionMessages, Session } from './session';
import {
  isSlashCommand,
  parseSlashCommand,
  SlashCommandManager,
} from './slashCommand';
import { App } from './ui/App';
import { useAppStore } from './ui/store';
import { UIBridge } from './uiBridge';
import type { UpgradeOptions } from './upgrade';

export { z as _zod } from 'zod';
export { ConfigManager as _ConfigManager } from './config';
export { query as _query } from './query';
export { createTool } from './tool';

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
  version: boolean;
  browser?: boolean;
  // string
  appendSystemPrompt?: string;
  approvalMode?: string;
  cwd?: string;
  language?: string;
  model?: string;
  outputFormat?: string;
  outputStyle?: string;
  planModel?: string;
  smallModel?: string;
  visionModel?: string;
  resume?: string;
  systemPrompt?: string;
  tools?: string;
  // array
  plugin: string[];
  mcpConfig: string[];
};

async function parseArgs(argv: any) {
  const { default: yargsParser } = await import('yargs-parser');
  const args = yargsParser(argv, {
    alias: {
      model: 'm',
      help: 'h',
      resume: 'r',
      quiet: 'q',
      continue: 'c',
      version: 'v',
    },
    default: {
      mcp: true,
      mcpConfig: [],
    },
    array: ['plugin', 'mcpConfig'],
    boolean: ['help', 'mcp', 'quiet', 'continue', 'version', 'browser'],
    string: [
      'appendSystemPrompt',
      'approvalMode',
      'cwd',
      'language',
      'mcpConfig',
      'model',
      'outputFormat',
      'outputStyle',
      'planModel',
      'smallModel',
      'visionModel',
      'resume',
      'systemPrompt',
      'tools',
    ],
  }) as Argv;
  if (args.resume && args.continue) {
    throw new Error('Cannot use --resume and --continue at the same time');
  }
  if (args.model === '') {
    throw new Error('Model cannot be empty string');
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
  --small-model <model>         Specify a small model for quick operations
  --vision-model <model>        Specify a vision model for image tasks
  -r, --resume <session-id>     Resume a session
  -c, --continue                Continue the latest session
  -q, --quiet                   Quiet mode, non interactive
  --browser                     Enable browser integration
  --cwd <path>                  Specify the working directory
  --system-prompt <prompt>      Custom system prompt for code agent
  --output-format <format>      Output format, text, stream-json, json
  --output-style <style>        Output style (name or path)
  --approval-mode <mode>        Tool approval mode, default, autoEdit, yolo
  --mcp-config <config>         MCP server configuration (JSON string with "mcpServers" object or file path)
  --tools <json>                Tools configuration (JSON object with tool names as keys and boolean values)

Examples:
  ${p} "Refactor this file to use hooks."
  ${p} -m gpt-4o "Add tests for the following code."
  ${p} --tools '{"write":false}' "analyze this code"
  ${p} --tools '{"bash":false,"write":false}' "explain the logic"

Commands:
  config                        Manage configuration
  commit                        Commit changes to the repository
  log [file]                    View session logs in HTML (optional file path)
  mcp                           Manage MCP servers
  run                           Run a command
  update                        Check for and apply updates
  workspace                     Manage workspaces
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
    let model: string | undefined;
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

    await context.apply({
      hook: 'telemetry',
      args: [
        {
          name: 'send',
          payload: {
            message: input,
            sessionId,
          },
        },
      ],
      type: PluginHookType.Parallel,
    });

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
  cwd: string,
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
  const paths = new Paths({
    productName: contextCreateOpts.productName,
    cwd,
  });
  const sessionId = (() => {
    if (argv.resume) {
      return argv.resume;
    }
    if (argv.continue) {
      return paths.getLatestSessionId() || Session.createSessionId();
    }
    return Session.createSessionId();
  })();
  const [messages, history] = (() => {
    const logPath = paths.getSessionLogPath(sessionId);
    const messages = loadSessionMessages({ logPath });
    const globalData = new GlobalData({
      globalDataPath: paths.getGlobalDataPath(),
    });
    const history = globalData.getProjectHistory({ cwd });
    return [messages, history];
  })();
  const initialPrompt = argv._.length > 0 ? argv._.join(' ') : '';
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
  const argv = await parseArgs(process.argv.slice(2));
  const cwd = argv.cwd || process.cwd();

  // Parse MCP config if provided
  const mcpServers = parseMcpConfig(argv.mcpConfig || [], cwd);

  let toolsConfig: Record<string, boolean> | undefined;
  if (argv.tools) {
    try {
      toolsConfig = JSON.parse(argv.tools);
      if (typeof toolsConfig !== 'object' || Array.isArray(toolsConfig)) {
        throw new Error('must be a JSON object like {"write":false}');
      }
      for (const [name, value] of Object.entries(toolsConfig)) {
        if (typeof value !== 'boolean') {
          throw new Error(
            `tool "${name}" must be true or false, got: ${value}`,
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error: Invalid --tools parameter');
      console.error(`  ${message}`);
      console.error(`  Example: --tools '{"write":false,"bash":false}'`);
      process.exit(1);
    }
  }

  const contextCreateOpts = {
    productName: opts.productName,
    productASCIIArt: opts.productASCIIArt,
    version: opts.version,
    argvConfig: {
      model: argv.model,
      planModel: argv.planModel,
      smallModel: argv.smallModel,
      visionModel: argv.visionModel,
      quiet: argv.quiet,
      outputFormat: argv.outputFormat,
      plugins: argv.plugin,
      systemPrompt: argv.systemPrompt,
      appendSystemPrompt: argv.appendSystemPrompt,
      language: argv.language,
      outputStyle: argv.outputStyle,
      approvalMode: argv.approvalMode,
      mcpServers,
      browser: argv.browser,
      tools: toolsConfig,
    },
    plugins: opts.plugins,
  };

  // sub commands
  const command = argv._[0];
  if (command === 'server') {
    await runServer({
      cwd,
      contextCreateOpts,
    });
    return;
  }
  const validCommands = [
    '__test',
    'config',
    'commit',
    'mcp',
    'log',
    'run',
    'server',
    'update',
    'workspace',
  ];
  if (validCommands.includes(command)) {
    const context = await Context.create({
      cwd,
      ...contextCreateOpts,
    });
    switch (command) {
      case '__test': {
        await runTest(context);
        break;
      }
      case 'config': {
        const { runConfig } = await import('./commands/config');
        await runConfig(context);
        break;
      }
      case 'mcp': {
        const { runMCP } = await import('./commands/mcp');
        await runMCP(context);
        break;
      }
      case 'log': {
        const { runLog } = await import('./commands/log');
        const logFilePath = argv._[1] ? String(argv._[1]) : undefined;
        await runLog(context, logFilePath);
        break;
      }
      case 'run': {
        const { runRun } = await import('./commands/run');
        await runRun(context);
        break;
      }
      case 'commit': {
        const { runCommit } = await import('./commands/commit');
        await runCommit(context);
        break;
      }
      case 'update': {
        const { runUpdate } = await import('./commands/update');
        await runUpdate(context, opts.upgrade);
        break;
      }
      case 'workspace': {
        const { runWorkspace } = await import('./commands/workspace');
        await runWorkspace(context);
        break;
      }
      default:
        throw new Error(`Unsupported command: ${command}`);
    }
    return;
  }

  if (argv.help) {
    printHelp(opts.productName.toLowerCase());
    return;
  }
  if (argv.version) {
    console.log(opts.version);
    return;
  }

  if (argv.quiet) {
    const context = await Context.create({
      cwd,
      ...contextCreateOpts,
    });
    await context.apply({
      hook: 'initialized',
      args: [{ cwd, quiet: true }],
      type: PluginHookType.Series,
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
    if (
      upgrade?.version.includes('-beta.') ||
      upgrade?.version.includes('-alpha.') ||
      upgrade?.version.includes('-rc.') ||
      upgrade?.version.includes('-canary.')
    ) {
      upgrade = undefined;
    }
    await runInteractive(argv, contextCreateOpts, cwd, upgrade);
  }
}
