#!/usr/bin/env bun

import readline from 'readline';

interface ParsedArgs {
  help: boolean;
  port?: number;
  host?: string;
}

function parseArgs(): ParsedArgs {
  const args = Bun.argv.slice(2);
  const result: ParsedArgs = { help: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      result.help = true;
    } else if (arg === '-p' || arg === '--port') {
      result.port = Number.parseInt(args[++i], 10);
    } else if (arg === '--host') {
      result.host = args[++i];
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Usage: bun scripts/test-run-server.ts [options]

Run the server command in quiet mode for development/testing.

Options:
  -h, --help       Show this help message
  -p, --port       Port number (default: 1024)
  --host           Host address (default: 127.0.0.1)

Examples:
  bun scripts/test-run-server.ts
  bun scripts/test-run-server.ts -p 3000
  bun scripts/test-run-server.ts --port 8080 --host 0.0.0.0
`);
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const serverArgs = ['server'];
  if (args.port) serverArgs.push('-p', String(args.port));
  if (args.host) serverArgs.push('-h', args.host);

  const { parseArgs: neovateParseArgs, runNeovate } = await import(
    '../src/index'
  );

  const argv = await neovateParseArgs(['--quiet', ...serverArgs]);

  console.log('Starting server in quiet mode...');
  const { shutdown } = await runNeovate({
    productName: 'neovate',
    version: 'dev',
    plugins: [],
    argv,
  });

  if (!shutdown) {
    console.log('Server did not return shutdown function');
    process.exit(1);
  }

  console.log('\nServer is running.');

  const shouldStop = await confirm('Stop server?');
  if (shouldStop) {
    await shutdown();
    console.log('Server stopped.');
  } else {
    console.log('Server continues running. Press Ctrl+C to stop.');
    await new Promise(() => {});
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
