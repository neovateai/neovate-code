import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { z } from 'zod';
import type { Context } from '../context';
import { DirectTransport, MessageBus } from '../messageBus';
import { NodeBridge } from '../nodeBridge';

// ANSI color codes
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

// Standalone shell commands that should be executed directly
const SHELL_COMMANDS = [
  'ls',
  'pwd',
  'clear',
  'exit',
  'quit',
  'whoami',
  'date',
  'cal',
  'top',
  'htop',
  'history',
  'which',
  'man',
  'touch',
  'head',
  'tail',
  'grep',
  'find',
  'sort',
  'wc',
  'diff',
  'tar',
  'zip',
  'unzip',
];

// Command prefixes that indicate shell commands
const SHELL_STARTERS = [
  'cd ',
  'ls ',
  'echo ',
  'cat ',
  'mkdir ',
  'rm ',
  'cp ',
  'mv ',
  'git ',
  'npm ',
  'node ',
  'npx ',
  'python',
  'pip ',
  'brew ',
  'curl ',
  'wget ',
  'chmod ',
  'chown ',
  'sudo ',
  'vi ',
  'vim ',
  'nano ',
  'code ',
  'open ',
  'export ',
  'source ',
  'docker ',
  'kubectl ',
  'aws ',
  'gcloud ',
  './',
  '/',
  '~',
  '$',
  '>',
  '>>',
  '|',
  '&&',
];

/**
 * Detect if input is natural language or a shell command.
 * Returns true if it's natural language (needs AI), false if it's a shell command.
 */
function isNaturalLanguage(text: string): boolean {
  // Exact match for standalone commands
  if (SHELL_COMMANDS.includes(text)) {
    return false;
  }
  // Check if starts with known shell command patterns
  if (SHELL_STARTERS.some((starter) => text.startsWith(starter))) {
    return false;
  }
  return true;
}

const SHELL_COMMAND_SYSTEM_PROMPT = `
You are a tool that converts natural language instructions into shell commands.
Your task is to transform user's natural language requests into precise and effective shell commands.

Please follow these rules:
1. If the user directly provides a shell command, return that command as is
2. If the user describes a task in natural language, convert it to the most appropriate shell command
3. Avoid using potentially dangerous commands (such as rm -rf /)
4. Provide complete commands, avoiding placeholders
5. Reply with only one command, don't provide multiple options
6. When no suitable command can be found, return the recommended command directly

## Response Format

Respond with valid JSON only, no additional text or markdown formatting.

Example response:
{
  "command": "ls -la",
  "explanation": "List all files including hidden ones with detailed information"
}
`;

function askPrompt(rl: readline.Interface, cwd: string): Promise<string> {
  return new Promise((resolve) => {
    const dirname = path.basename(cwd);
    const prompt = `${GREEN}${dirname}${RESET} > `;
    rl.question(prompt, (answer) => {
      resolve(answer?.trim() ?? '');
    });
  });
}

async function generateCommand(
  messageBus: MessageBus,
  prompt: string,
  cwd: string,
  model?: string,
): Promise<{ command: string; explanation: string } | null> {
  process.stdout.write(`${DIM}Generating with ${model}...${RESET}\r`);

  try {
    const result = await messageBus.request('utils.quickQuery', {
      cwd,
      userPrompt: prompt,
      systemPrompt: SHELL_COMMAND_SYSTEM_PROMPT,
      model,
      responseFormat: {
        type: 'json',
        schema: z.toJSONSchema(
          z.object({
            command: z.string(),
            explanation: z.string(),
          }),
        ),
      },
    });

    // Clear the "Generating..." line
    process.stdout.write('\x1b[2K\r');

    if (!result.success || !result.data?.text) {
      console.error('Failed to generate command');
      return null;
    }

    const parsed = JSON.parse(result.data.text);
    return {
      command: parsed.command,
      explanation: parsed.explanation,
    };
  } catch (error: any) {
    process.stdout.write('\x1b[2K\r');
    console.error(`Error: ${error.message || 'Failed to generate command'}`);
    return null;
  }
}

function confirmCommand(
  rl: readline.Interface,
  command: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const prompt = `${YELLOW}→ ${command}${RESET} ${DIM}[Enter/Esc]${RESET} `;
    process.stdout.write(prompt);

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    const cleanup = () => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(wasRaw);
    };

    const onData = (key: Buffer) => {
      const char = key.toString();

      // Enter pressed - execute command
      if (char === '\r' || char === '\n') {
        cleanup();
        resolve(true);
        return;
      }

      // Escape pressed - cancel
      if (char === '\x1b') {
        cleanup();
        process.stdout.write(`\n${DIM}Cancelled${RESET}\n\n`);
        resolve(false);
        return;
      }
    };

    stdin.on('data', onData);
  });
}

function executeCommand(
  command: string,
  cwd: string,
): Promise<{ exitCode: number | null }> {
  return new Promise((resolve) => {
    const isWindows = os.platform() === 'win32';
    const shell = isWindows ? 'cmd.exe' : process.env.SHELL || '/bin/bash';
    const shellArgs = isWindows ? ['/c', command] : ['-c', command];

    const child = spawn(shell, shellArgs, {
      cwd,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      resolve({ exitCode: code });
    });

    child.on('error', (err) => {
      console.error(`Execution error: ${err.message}`);
      resolve({ exitCode: 1 });
    });
  });
}

/**
 * Try to change directory. Returns new cwd if successful, null otherwise.
 */
function tryChangeDirectory(
  command: string,
  currentCwd: string,
): string | null {
  // Match "cd" or "cd <path>"
  const cdMatch = command.match(/^cd(?:\s+(.*))?$/);
  if (!cdMatch) return null;

  let targetPath = cdMatch[1]?.trim();

  // "cd" without args goes to home directory
  if (!targetPath) {
    targetPath = os.homedir();
  } else {
    // Expand ~ to home directory
    if (targetPath.startsWith('~')) {
      targetPath = path.join(os.homedir(), targetPath.slice(1));
    }
    // Resolve relative paths
    if (!path.isAbsolute(targetPath)) {
      targetPath = path.resolve(currentCwd, targetPath);
    }
  }

  try {
    process.chdir(targetPath);
    return process.cwd();
  } catch (err: any) {
    console.error(`cd: ${err.message}`);
    return null;
  }
}

function printHelp(productName: string) {
  console.log(
    `
Usage:
  ${productName} run-2 [options]

Interactive shell command generator. Converts natural language to shell commands.

Options:
  -h, --help            Show help
  -m, --model <model>   Specify model to use

Controls:
  dirname > prompt      Type natural language, press Enter to generate command
  → command [Enter]     Press Enter to execute, Ctrl+C to cancel
  Ctrl+D                Exit the program
    `.trim(),
  );
}

export async function runRun(context: Context) {
  const { default: yargsParser } = await import('yargs-parser');
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      model: 'm',
      help: 'h',
    },
    boolean: ['help'],
    string: ['model'],
  });

  if (argv.help) {
    printHelp(context.productName.toLowerCase());
    return;
  }

  const model = argv.model || context.config.smallModel || context.config.model;

  // Initialize NodeBridge for AI queries
  const nodeBridge = new NodeBridge({
    contextCreateOpts: {
      productName: context.productName,
      version: context.version,
      argvConfig: {},
      plugins: context.plugins,
    },
  });

  const [clientTransport, nodeTransport] = DirectTransport.createPair();
  const messageBus = new MessageBus();
  messageBus.setTransport(clientTransport);
  nodeBridge.messageBus.setTransport(nodeTransport);

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Track current working directory
  let cwd = context.cwd;

  // Handle Ctrl+D to exit
  rl.on('close', () => {
    console.log('\nBye!');
    process.exit(0);
  });

  // Main loop
  while (true) {
    const userInput = await askPrompt(rl, cwd);

    if (userInput === '') {
      // Empty input, just continue to next prompt
      continue;
    }

    // Check if user directly typed a cd command
    const newCwd = tryChangeDirectory(userInput, cwd);
    if (newCwd !== null) {
      cwd = newCwd;
      continue;
    }

    // If it's a shell command, execute directly without AI
    if (!isNaturalLanguage(userInput)) {
      await executeCommand(userInput, cwd);
      console.log();
      continue;
    }

    // Natural language: generate command via AI
    const result = await generateCommand(messageBus, userInput, cwd, model);
    if (!result) continue;

    const confirmed = await confirmCommand(rl, result.command);
    if (!confirmed) continue;

    // Check if generated command is cd
    const cdNewCwd = tryChangeDirectory(result.command, cwd);
    if (cdNewCwd !== null) {
      cwd = cdNewCwd;
      continue;
    }

    await executeCommand(result.command, cwd);
    console.log(); // Add spacing after command output
  }
}
