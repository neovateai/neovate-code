import { tool } from '@openai/agents';
import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { z } from 'zod';
import { Context } from '../context';
import { ApprovalContext, EnhancedTool, enhanceTool } from '../tool';

const BANNED_COMMANDS = [
  'alias',
  'aria2c',
  'axel',
  'bash',
  'chrome',
  'curl',
  'curlie',
  'eval',
  'firefox',
  'fish',
  'http-prompt',
  'httpie',
  'links',
  'lynx',
  'nc',
  'rm',
  'safari',
  'sh',
  'source',
  'telnet',
  'w3m',
  'wget',
  'xh',
  'zsh',
];

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

function getCommandRoot(command: string): string | undefined {
  return command
    .trim()
    .replace(/[{}()]/g, '')
    .split(/[\s;&|]+/)[0]
    ?.split(/[/\\]/)
    .pop();
}

function isHighRiskCommand(command: string): boolean {
  const highRiskPatterns = [
    /rm\s+.*(-rf|--recursive)/i,
    /sudo/i,
    /curl.*\|.*sh/i,
    /wget.*\|.*sh/i,
    /dd\s+if=/i,
    /mkfs/i,
    /fdisk/i,
    /format/i,
    /del\s+.*\/[qs]/i,
  ];

  // Check for command substitution
  if (command.includes('$(') || command.includes('`')) {
    return true;
  }

  const commandRoot = getCommandRoot(command);
  if (!commandRoot) {
    return true;
  }

  return (
    highRiskPatterns.some((pattern) => pattern.test(command)) ||
    BANNED_COMMANDS.includes(commandRoot.toLowerCase())
  );
}

function validateCommand(command: string): string | null {
  if (!command.trim()) {
    return 'Command cannot be empty.';
  }

  const commandRoot = getCommandRoot(command);
  if (!commandRoot) {
    return 'Could not identify command root.';
  }

  // Check for command substitution
  if (command.includes('$(') || command.includes('`')) {
    return 'Command substitution is not allowed for security reasons.';
  }

  if (BANNED_COMMANDS.includes(commandRoot.toLowerCase())) {
    return 'Command not allowed for security reasons.';
  }

  return null;
}

async function executeCommand(
  command: string,
  timeout: number,
  cwd: string,
): Promise<any> {
  const actualTimeout = Math.min(timeout, MAX_TIMEOUT);

  const validationError = validateCommand(command);
  if (validationError) {
    return {
      success: false,
      error: validationError,
      command,
    };
  }

  const isWindows = os.platform() === 'win32';
  const tempFileName = `shell_pgrep_${crypto.randomBytes(6).toString('hex')}.tmp`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  // Wrap command to capture background PIDs on non-Windows systems
  const wrappedCommand = isWindows
    ? command
    : (() => {
        let cmd = command.trim();
        if (!cmd.endsWith('&')) cmd += ';';
        return `{ ${cmd} }; __code=$?; pgrep -g 0 >${tempFilePath} 2>&1; exit $__code;`;
      })();

  return new Promise((resolve) => {
    const shell = isWindows
      ? spawn('cmd.exe', ['/c', wrappedCommand], {
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd,
        })
      : spawn('bash', ['-c', wrappedCommand], {
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: true,
          cwd,
        });

    let exited = false;
    let stdout = '';
    let stderr = '';
    let error: Error | null = null;
    let code: number | null = null;
    let processSignal: NodeJS.Signals | null = null;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!exited && shell.pid) {
        if (isWindows) {
          spawn('taskkill', ['/pid', shell.pid.toString(), '/f', '/t']);
        } else {
          try {
            process.kill(-shell.pid, 'SIGTERM');
            setTimeout(() => {
              if (shell.pid && !exited) {
                process.kill(-shell.pid, 'SIGKILL');
              }
            }, 200);
          } catch {
            shell.kill('SIGKILL');
          }
        }
      }
    }, actualTimeout);

    shell.stdout?.on('data', (data: Buffer) => {
      if (!exited) {
        const newData = data.toString().replace(/\x1b\[[0-9;]*m/g, '');
        if (stdout.length + newData.length > MAX_OUTPUT_SIZE) {
          stdout += newData.substring(0, MAX_OUTPUT_SIZE - stdout.length);
          stdout += '\n... [Output truncated due to size limit]';
        } else {
          stdout += newData;
        }
      }
    });

    shell.stderr?.on('data', (data: Buffer) => {
      if (!exited) {
        const newData = data.toString().replace(/\x1b\[[0-9;]*m/g, '');
        if (stderr.length + newData.length > MAX_OUTPUT_SIZE) {
          stderr += newData.substring(0, MAX_OUTPUT_SIZE - stderr.length);
          stderr += '\n... [Output truncated due to size limit]';
        } else {
          stderr += newData;
        }
      }
    });

    shell.on('error', (err: Error) => {
      error = err;
      error.message = error.message.replace(wrappedCommand, command);
    });

    shell.on('exit', (_code: number | null, _signal: NodeJS.Signals | null) => {
      exited = true;
      code = _code;
      processSignal = _signal;
      clearTimeout(timeoutId);

      // Parse background PIDs on non-Windows systems
      const backgroundPIDs: number[] = [];
      if (!isWindows && fs.existsSync(tempFilePath)) {
        try {
          const pgrepLines = fs
            .readFileSync(tempFilePath, 'utf8')
            .split('\n')
            .filter(Boolean);
          for (const line of pgrepLines) {
            if (/^\d+$/.test(line)) {
              const pid = Number(line);
              if (pid !== shell.pid) {
                backgroundPIDs.push(pid);
              }
            }
          }
          fs.unlinkSync(tempFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }

      const result = {
        command,
        timeout: actualTimeout,
        exitCode: code,
        signal: processSignal,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        backgroundPIDs: backgroundPIDs.length > 0 ? backgroundPIDs : undefined,
      };

      if (error || code !== 0 || processSignal) {
        resolve({
          success: false,
          error: error?.message || `Command exited with code ${code}`,
          ...result,
        });
      } else {
        resolve({
          success: true,
          message: stdout.trim() || 'Command executed successfully',
          ...result,
        });
      }
    });
  });
}

export function createBashTool(opts: { context: Context }): EnhancedTool {
  return enhanceTool(
    tool({
      name: 'bash',
      description:
        `Run shell commands in the terminal, ensuring proper handling and security measures.

Before using this tool, please follow these steps:
- Verify that the command is not one of the banned commands: ${BANNED_COMMANDS.join(', ')}.
- Always quote file paths that contain spaces with double quotes (e.g., cd "path with spaces/file.txt")
- Capture the output of the command.

Notes:
- The command argument is required.
- You can specify an optional timeout in milliseconds (up to ${MAX_TIMEOUT}ms / 10 minutes). If not specified, commands will timeout after 30 minutes.
- VERY IMPORTANT: You MUST avoid using search commands like \`find\` and \`grep\`. Instead use grep and glob tool to search. You MUST avoid read tools like \`cat\`, \`head\`, \`tail\`, and \`ls\`, and use \`read\` and \`ls\` tool to read files.
- If you _still_ need to run \`grep\`, STOP. ALWAYS USE ripgrep at \`rg\` first, which all users have pre-installed.
- When issuing multiple commands, use the ';' or '&&' operator to separate them. DO NOT use newlines (newlines are ok in quoted strings).
- Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`. You may use \`cd\` if the User explicitly requests it.
<good-example>
pytest /foo/bar/tests
</good-example>
<bad-example>
cd /foo/bar && pytest tests
</bad-example>`.trim(),
      parameters: z.object({
        command: z.string().describe('The command to execute'),
        timeout: z
          .number()
          .optional()
          .nullable()
          .describe(`Optional timeout in milliseconds (max ${MAX_TIMEOUT})`),
      }),
      execute: async ({ command, timeout = DEFAULT_TIMEOUT }) => {
        if (!command) {
          return {
            success: false,
            error: 'Command cannot be empty.',
          };
        }
        return executeCommand(
          command,
          timeout || DEFAULT_TIMEOUT,
          opts.context.cwd,
        );
      },
    }),
    {
      category: 'command',
      riskLevel: 'high',
      needsApproval: async (context: ApprovalContext) => {
        const { params, approvalMode } = context;
        const command = params.command as string;

        if (!command) {
          return false;
        }

        // Always require approval for high-risk commands
        if (isHighRiskCommand(command)) {
          return true;
        }

        // Check if command is banned (these should never be approved)
        const commandRoot = getCommandRoot(command);
        if (
          commandRoot &&
          BANNED_COMMANDS.includes(commandRoot.toLowerCase())
        ) {
          return true; // This will be denied by approval system
        }

        // For other commands, defer to approval mode settings
        return approvalMode !== 'yolo';
      },
    },
  );
}
