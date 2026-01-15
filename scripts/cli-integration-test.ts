#!/usr/bin/env bun

import { spawn } from 'child_process';

interface ParsedArgs {
  help: boolean;
  model: string;
  prompt: string;
}

function parseArgs(): ParsedArgs {
  const args = Bun.argv.slice(2);
  const result: ParsedArgs = {
    help: false,
    model: 'modelwatch/glm-4.7',
    prompt: 'hello',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        result.help = true;
        break;
      case '-m':
      case '--model':
        result.model = args[++i];
        break;
      default:
        if (!arg.startsWith('-')) {
          result.prompt = arg;
        }
        break;
    }
  }
  return result;
}

function showHelp(): void {
  console.log(`
Usage: bun scripts/cli-integration-test.ts [options] [prompt]

Run CLI integration test - executes the CLI with JSON output and validates the response.

Options:
  -h, --help       Show this help message
  -m, --model      Model to use (default: modelwatch/glm-4.7)

Arguments:
  prompt           Prompt to send to the CLI (default: "hello")

Examples:
  bun scripts/cli-integration-test.ts
  bun scripts/cli-integration-test.ts "what is 2+2"
  bun scripts/cli-integration-test.ts -m anthropic/claude-3-haiku "hello"
`);
}

function stripInvisibleChars(str: string): string {
  return str
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/^\uFEFF/, '')
    .trim();
}

async function runCli(model: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'node',
      ['./dist/cli.mjs', '-m', model, '-q', '--output-format', 'json', prompt],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`CLI exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    proc.on('error', reject);
  });
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log(`Running CLI integration test...`);
  console.log(`  Model: ${args.model}`);
  console.log(`  Prompt: "${args.prompt}"`);
  console.log('');

  const output = await runCli(args.model, args.prompt);

  console.log('Output:');
  console.log(output);
  console.log('');

  try {
    JSON.parse(output);
    console.log('✓ JSON parse successful');
  } catch (err) {
    console.error('✗ JSON parse failed:', (err as Error).message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
