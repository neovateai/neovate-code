import { DirectTransport, MessageBus } from '../messageBus';
import { NodeBridge } from '../nodeBridge';

function parseValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function parseCallArgs(argv: string[]): {
  help: boolean;
  list: boolean;
  handler: string | null;
  data: Record<string, unknown>;
} {
  const result: {
    help: boolean;
    list: boolean;
    handler: string | null;
    data: Record<string, unknown>;
    jsonData: Record<string, unknown> | null;
  } = { help: false, list: false, handler: null, data: {}, jsonData: null };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      result.help = true;
    } else if (arg === '-l' || arg === '--list') {
      result.list = true;
    } else if (arg.startsWith('--data=') || arg === '--data') {
      let jsonStr: string;
      if (arg.startsWith('--data=')) {
        jsonStr = arg.slice(7);
      } else if (i + 1 < argv.length) {
        jsonStr = argv[++i];
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
      const withoutDashes = arg.slice(2);
      if (withoutDashes.includes('=')) {
        const eqIndex = withoutDashes.indexOf('=');
        const key = withoutDashes.slice(0, eqIndex);
        const value = withoutDashes.slice(eqIndex + 1);
        result.data[key] = parseValue(value);
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        result.data[withoutDashes] = parseValue(argv[++i]);
      } else {
        result.data[withoutDashes] = true;
      }
    } else if (!arg.startsWith('-') && !result.handler) {
      result.handler = arg;
    }
  }

  if (result.jsonData) {
    result.data = { ...result.data, ...result.jsonData };
  }

  return result;
}

function printHelp(productName: string): void {
  console.log(
    `
Usage:
  ${productName} call [handler] [options]

Call NodeBridge handlers directly.

Arguments:
  handler           Handler name to call (e.g., models.list, git.status)

Options:
  -h, --help        Show this help message
  -l, --list        List all available handlers
  --data <json>     Pass handler data as JSON (takes priority over --key=value)

Handler Arguments:
  All --key=value or --key value pairs are passed to the handler as data.
  Values are auto-converted: numbers become Number, true/false become Boolean.

Examples:
  ${productName} call --list
  ${productName} call models.list
  ${productName} call models.test --model=anthropic/claude-sonnet-4-20250514
  ${productName} call git.status --cwd=/path/to/repo
  ${productName} call config.list --cwd=/path/to/project
  ${productName} call sessions.list
  ${productName} call models.test --data='{"model":"anthropic/claude-sonnet-4-20250514"}'
    `.trim(),
  );
}

function listHandlers(names: string[]): void {
  const grouped: Record<string, string[]> = {};
  for (const name of names.sort()) {
    const [group] = name.split('.');
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(`  ${name}`);
  }

  console.log('\nAvailable handlers:\n');
  for (const [group, handlers] of Object.entries(grouped)) {
    console.log(`\x1b[36m${group}\x1b[0m`);
    for (const handler of handlers) {
      console.log(handler);
    }
    console.log();
  }
}

export async function runCall(opts: {
  cwd: string;
  contextCreateOpts: any;
}): Promise<void> {
  const callArgs = parseCallArgs(process.argv.slice(3));

  if (callArgs.help) {
    printHelp(opts.contextCreateOpts.productName?.toLowerCase() || 'neovate');
    return;
  }

  const nodeBridge = new NodeBridge({
    contextCreateOpts: opts.contextCreateOpts,
  });
  const [clientTransport, nodeTransport] = DirectTransport.createPair();
  const messageBus = new MessageBus();
  messageBus.setTransport(clientTransport);
  nodeBridge.messageBus.setTransport(nodeTransport);

  if (callArgs.list) {
    const names = Array.from(nodeBridge.messageBus.messageHandlers.keys());
    listHandlers(names);
    return;
  }

  if (!callArgs.handler) {
    console.error(
      'Error: No handler specified. Use --list to see available handlers.\n',
    );
    printHelp(opts.contextCreateOpts.productName?.toLowerCase() || 'neovate');
    process.exit(1);
  }

  if (!('cwd' in callArgs.data)) {
    callArgs.data.cwd = opts.cwd;
  }

  try {
    const response = await Promise.race([
      messageBus.request(callArgs.handler, callArgs.data),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout (30s)')), 30000),
      ),
    ]);
    console.log(JSON.stringify(response, null, 2));
    process.exit(0);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
