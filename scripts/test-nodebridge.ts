#!/usr/bin/env bun

/**
 * Test script for NodeBridge handlers
 *
 * Usage:
 *   bun scripts/test-nodebridge.ts [handler] [options]
 *
 * Examples:
 *   bun scripts/test-nodebridge.ts models.test --model=anthropic/claude-sonnet-4-20250514
 *   bun scripts/test-nodebridge.ts models.list
 *   bun scripts/test-nodebridge.ts --list
 */

import { DirectTransport, MessageBus } from '../src/messageBus';
import { NodeBridge } from '../src/nodeBridge';

interface ParsedArgs {
  help: boolean;
  list: boolean;
  handler: string | null;
  data: Record<string, unknown>;
  jsonData: Record<string, unknown> | null;
}

/**
 * Parse a value string to appropriate type (number, boolean, or string)
 */
function parseValue(value: string): unknown {
  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Number (including negative and decimal)
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value;
}

function parseArgs(): ParsedArgs {
  const args = Bun.argv.slice(2);
  const result: ParsedArgs = {
    help: false,
    list: false,
    handler: null,
    data: {},
    jsonData: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      result.help = true;
    } else if (arg === '-l' || arg === '--list') {
      result.list = true;
    } else if (arg.startsWith('--data=') || arg === '--data') {
      // Handle --data with JSON
      let jsonStr: string;
      if (arg.startsWith('--data=')) {
        jsonStr = arg.slice(7);
      } else if (i + 1 < args.length) {
        jsonStr = args[++i];
      } else {
        console.error('Error: --data requires a JSON value');
        process.exit(1);
      }
      try {
        result.jsonData = JSON.parse(jsonStr);
      } catch {
        console.error(`Error: Invalid JSON for --data: ${jsonStr}`);
        process.exit(1);
      }
    } else if (arg.startsWith('--')) {
      // Handle --key=value or --key value format
      const withoutDashes = arg.slice(2);

      if (withoutDashes.includes('=')) {
        // --key=value format
        const eqIndex = withoutDashes.indexOf('=');
        const key = withoutDashes.slice(0, eqIndex);
        const value = withoutDashes.slice(eqIndex + 1);
        result.data[key] = parseValue(value);
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        // --key value format
        const key = withoutDashes;
        const value = args[++i];
        result.data[key] = parseValue(value);
      } else {
        // --flag (boolean flag without value)
        result.data[withoutDashes] = true;
      }
    } else if (!arg.startsWith('-') && !result.handler) {
      result.handler = arg;
    }
  }

  // Merge: --data (jsonData) takes priority over --key=value (data)
  if (result.jsonData) {
    result.data = { ...result.data, ...result.jsonData };
  }

  return result;
}

function showHelp(): void {
  console.log(`
Usage: bun scripts/test-nodebridge.ts [handler] [options]

Test NodeBridge message handlers.

Arguments:
  handler           Handler name to test (e.g., models.test, models.list)

Options:
  -h, --help        Show this help message
  -l, --list        List all available handlers
  --data <json>     Pass handler data as JSON (takes priority over --key=value)

Handler Arguments:
  All --key=value or --key value pairs are passed to the handler as data.
  Values are auto-converted: numbers become Number, true/false become Boolean.

Examples:
  bun scripts/test-nodebridge.ts --list
  bun scripts/test-nodebridge.ts models.list
  bun scripts/test-nodebridge.ts models.test --model=anthropic/claude-sonnet-4-20250514
  bun scripts/test-nodebridge.ts models.test --model=openai/gpt-4o --prompt="Say hello" --timeout=5000
  bun scripts/test-nodebridge.ts models.test --data='{"model":"anthropic/claude-sonnet-4-20250514","timeout":5000}'
  bun scripts/test-nodebridge.ts utils.getPaths --cwd=/path/to/dir --maxFiles=100
  bun scripts/test-nodebridge.ts projects.list --includeSessionDetails=true
`);
}

// Available handlers for listing
const HANDLERS: Record<string, string> = {
  // Models
  'models.list': 'List all available models grouped by provider',
  'models.test': 'Test a specific model with a simple request',

  // Config
  'config.list': 'List all configuration',

  // Providers
  'providers.list': 'List all available providers',

  // MCP
  'mcp.list': 'List MCP servers',
  'mcp.getStatus': 'Get MCP status',

  // Output Styles
  'outputStyles.list': 'List available output styles',

  // Project
  'project.getRepoInfo': 'Get repository information',
  'project.workspaces.list': 'List all workspaces',

  // Projects
  'projects.list': 'List all projects that have been used',

  // Sessions
  'sessions.list': 'List all sessions',
  'sessions.remove': 'Remove a session by sessionId',

  // Skills
  'skills.list': 'List all loaded skills',
  'skills.get': 'Get a specific skill by name with body content',
  'skills.add': 'Add skill from remote source (GitHub)',
  'skills.remove': 'Remove an installed skill',
  'skills.preview': 'Preview skills from a source before installing',
  'skills.install': 'Install selected skills from a preview',

  // Slash Commands
  'slashCommand.list': 'List all slash commands',

  // Git
  'git.status': 'Get git status',
  'git.detectGitHub': 'Detect GitHub CLI and remote',

  // Utils
  'utils.getPaths': 'Get file paths in project',
  'utils.detectApps': 'Detect installed applications',
  'utils.playSound': 'Play a system sound or preset',
};

function listHandlers(): void {
  console.log('\nAvailable handlers:\n');
  const grouped: Record<string, string[]> = {};

  for (const [name, description] of Object.entries(HANDLERS)) {
    const [group] = name.split('.');
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(`  ${name.padEnd(30)} ${description}`);
  }

  for (const [group, handlers] of Object.entries(grouped)) {
    console.log(`\x1b[36m${group}\x1b[0m`);
    for (const handler of handlers) {
      console.log(handler);
    }
    console.log();
  }
}

async function createNodeBridge(): Promise<MessageBus> {
  const nodeBridge = new NodeBridge({
    contextCreateOpts: {
      productName: 'neovate',
      version: '0.0.0-test',
      argvConfig: {},
      plugins: [],
    },
  });

  const [uiTransport, nodeTransport] = DirectTransport.createPair();
  const uiMessageBus = new MessageBus();
  uiMessageBus.setTransport(uiTransport);
  nodeBridge.messageBus.setTransport(nodeTransport);

  return uiMessageBus;
}

async function testHandler(
  messageBus: MessageBus,
  handler: string,
  data: Record<string, unknown>,
): Promise<void> {
  console.log(`\n\x1b[36m━━━ Testing: ${handler} ━━━\x1b[0m\n`);
  console.log('\x1b[33mRequest:\x1b[0m');
  console.log(JSON.stringify(data, null, 2));

  const startTime = Date.now();

  try {
    const response = await Promise.race([
      messageBus.request(handler, data),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout (30s)')), 30000),
      ),
    ]);

    const duration = Date.now() - startTime;

    console.log(`\n\x1b[32mResponse:\x1b[0m (${duration}ms)`);
    console.log(JSON.stringify(response, null, 2));
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`\n\x1b[31mError:\x1b[0m (${duration}ms)`);
    console.log(error.message);
    if (error.stack) {
      console.log('\x1b[90m' + error.stack + '\x1b[0m');
    }
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.list) {
    listHandlers();
    process.exit(0);
  }

  if (!args.handler) {
    console.error(
      'Error: No handler specified. Use --list to see available handlers.\n',
    );
    showHelp();
    process.exit(1);
  }

  console.log('\x1b[90mInitializing NodeBridge...\x1b[0m');
  const messageBus = await createNodeBridge();

  await testHandler(messageBus, args.handler, args.data);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
