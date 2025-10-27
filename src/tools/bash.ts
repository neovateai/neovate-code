import crypto from 'crypto';
import createDebug from 'debug';
import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { z } from 'zod';
import { TOOL_NAMES } from '../constants';
import type { Context } from '../context';
import { createTool } from '../tool';
import { getErrorMessage } from '../utils/error';
import { shellExecute } from '../utils/shell-execution';

const debug = createDebug('neovate:tools:bash');

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

/**
 * Truncate output by line count, showing maximum 5 lines
 */
function truncateOutput(output: string, maxLines: number = 5): string {
  const lines = output.split('\n');

  if (lines.length <= maxLines) {
    return output;
  }

  const visibleLines = lines.slice(0, maxLines);
  const remainingCount = lines.length - maxLines;

  return visibleLines.join('\n') + `\n… +${remainingCount} lines`;
}

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

export function validateCommand(command: string): string | null {
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

  return null;
}

async function executeCommand(command: string, timeout: number, cwd: string) {
  const actualTimeout = Math.min(timeout, MAX_TIMEOUT);

  const validationError = validateCommand(command);
  if (validationError) {
    return {
      isError: true,
      llmContent: validationError,
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

  debug('wrappedCommand', wrappedCommand);

  const { result: resultPromise } = shellExecute(
    wrappedCommand,
    cwd,
    actualTimeout,
  );

  const result = await resultPromise;

  const backgroundPIDs: number[] = [];
  if (os.platform() !== 'win32') {
    if (fs.existsSync(tempFilePath)) {
      const pgrepLines = fs
        .readFileSync(tempFilePath, 'utf8')
        .split('\n')
        .filter(Boolean);
      for (const line of pgrepLines) {
        if (!/^\d+$/.test(line)) {
          console.error(`pgrep: ${line}`);
        }
        const pid = Number(line);
        if (pid !== result.pid) {
          backgroundPIDs.push(pid);
        }
      }
    }
  }

  let llmContent = '';
  if (result.cancelled) {
    llmContent = 'Command execution timed out and was cancelled.';
    if (result.output.trim()) {
      llmContent += ` Below is the output (on stdout and stderr) before it was cancelled:\n${result.output}`;
    } else {
      llmContent += ' There was no output before it was cancelled.';
    }
  } else {
    const finalError = result.error
      ? result.error.message.replace(wrappedCommand, command)
      : '(none)';
    llmContent = [
      `Command: ${command}`,
      `Directory: ${cwd || '(root)'}`,
      `Stdout: ${result.stdout || '(empty)'}`,
      `Stderr: ${result.stderr || '(empty)'}`,
      `Error: ${finalError}`, // Use the cleaned error string.
      `Exit Code: ${result.exitCode ?? '(none)'}`,
      `Signal: ${result.signal ?? '(none)'}`,
      `Background PIDs: ${
        backgroundPIDs.length ? backgroundPIDs.join(', ') : '(none)'
      }`,
      `Process Group PGID: ${result.pid ?? '(none)'}`,
    ].join('\n');
  }

  debug('llmContent', llmContent);

  let message = '';
  if (result.output?.trim()) {
    debug('result.output:', result.output);

    const safeOutput =
      typeof result.output === 'string' ? result.output : String(result.output);
    message = truncateOutput(safeOutput);

    if (message !== result.output) {
      debug(
        'output was truncated from',
        result.output.length,
        'to',
        message.length,
      );
    }
  } else {
    if (result.cancelled) {
      message = 'Command execution timed out and was cancelled.';
    } else if (result.signal) {
      message = `Command execution was terminated by signal ${result.signal}.`;
    } else if (result.error) {
      message = `Command failed: ${getErrorMessage(result.error)}`;
    } else if (result.exitCode !== null && result.exitCode !== 0) {
      message = `Command exited with code: ${result.exitCode}`;
    } else {
      message = 'Command executed successfully.';
    }
  }

  return {
    llmContent,
    returnDisplay: message,
  };
}

export function createBashTool(opts: { cwd: string; context: Context }) {
  return createTool({
    name: TOOL_NAMES.BASH,
    description:
      `Run shell commands in the terminal, ensuring proper handling and security measures.

Before using this tool, please follow these steps:
- Verify that the command is not one of the banned commands: ${BANNED_COMMANDS.join(', ')}.
- Always quote file paths that contain spaces with double quotes (e.g., cd "path with spaces/file.txt")
- Capture the output of the command.

Notes:
- The command argument is required.
- You can specify an optional timeout in milliseconds (up to ${MAX_TIMEOUT}ms / 10 minutes). If not specified, commands will timeout after 30 minutes.
- You can use the \`run_in_background\` parameter to run the command in the background, which allows you to continue working while the command runs. You can monitor the output using the ${TOOL_NAMES.BASH_OUTPUT} tool as it becomes available.
- VERY IMPORTANT: You MUST avoid using search commands like \`find\` and \`grep\`. Instead use grep and glob tool to search. You MUST avoid read tools like \`cat\`, \`head\`, \`tail\`, and \`ls\`, and use \`read\` and \`ls\` tool to read files.
- If you _still_ need to run \`grep\`, STOP. ALWAYS USE ripgrep at \`rg\` first, which all users have pre-installed.
- When issuing multiple commands, use the ';' or '&&' operator to separate them. DO NOT use newlines (newlines are ok in quoted strings).
- Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`. You may use \`cd\` if the User explicitly requests it.
- Don't add \`<command>\` wrapper to the command.

<good-example>
pytest /foo/bar/tests
</good-example>
<bad-example>
cd /foo/bar && pytest tests
</bad-example>
<bad-example>
<command>pytest /foo/bar/tests</command>
</bad-example>
`.trim(),
    parameters: z.object({
      command: z.string().describe('The command to execute'),
      timeout: z
        .number()
        .optional()
        .nullable()
        .describe(`Optional timeout in milliseconds (max ${MAX_TIMEOUT})`),
      run_in_background: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          `Set to true to run this command in the background. Use ${TOOL_NAMES.BASH_OUTPUT} to read the output later.`,
        ),
    }),
    getDescription: ({ params }) => {
      if (!params.command || typeof params.command !== 'string') {
        return 'No command provided';
      }
      const command = params.command.trim();
      return command.length > 100 ? command.substring(0, 97) + '...' : command;
    },
    execute: async ({
      command,
      timeout = DEFAULT_TIMEOUT,
      run_in_background = false,
    }) => {
      try {
        if (!command) {
          return {
            llmContent: 'Error: Command cannot be empty.',
            isError: true,
          };
        }

        if (run_in_background) {
          const manager = opts.context?.backgroundTaskManager;
          if (!manager) {
            return {
              llmContent:
                'Error: Background tasks are not supported in this session.',
              isError: true,
            };
          }

          const taskId = await manager.startTask(
            command,
            opts.cwd,
            timeout || DEFAULT_TIMEOUT,
          );

          return {
            llmContent: [
              `Background task started successfully`,
              `Task ID: ${taskId}`,
              `Command: ${command}`,
              `Use bash_output tool with task_id="${taskId}" to retrieve output`,
            ].join('\n'),
            returnDisplay: `Task ${taskId} started`,
          };
        }

        return await executeCommand(
          command,
          timeout || DEFAULT_TIMEOUT,
          opts.cwd,
        );
      } catch (e) {
        return {
          isError: true,
          llmContent:
            e instanceof Error
              ? `Command execution failed: ${getErrorMessage(e)}`
              : 'Command execution failed.',
        };
      }
    },
    approval: {
      category: 'command',
      needsApproval: async (context) => {
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
  });
}

export function createBashOutputTool(opts: { context: Context }) {
  return createTool({
    name: TOOL_NAMES.BASH_OUTPUT,
    description: `
- Retrieves output from a running or completed background bash shell
- Takes a task_id parameter identifying the shell
- Always returns only new output since the last check
- Returns stdout and stderr output along with shell status
- Supports optional regex filtering to show only lines matching a pattern
- Use this tool when you need to monitor or check the output of a long-running shell
- Shell IDs can be found using the /bashes command
`.trim(),
    parameters: z.object({
      task_id: z
        .string()
        .describe('The ID of the background shell to retrieve output from'),
      incremental: z
        .boolean()
        .optional()
        .default(false)
        .describe('Only return new output since last read'),
      stream: z
        .enum(['stdout', 'stderr', 'both'])
        .optional()
        .default('both')
        .describe('Which output stream to retrieve'),
    }),
    getDescription: ({ params }) => {
      const taskId = params.task_id as string;
      const incremental = params.incremental as boolean;
      return `Get ${incremental ? 'new' : 'all'} output from task ${taskId}`;
    },
    execute: async ({ task_id, incremental = false, stream = 'both' }) => {
      const manager = opts.context?.backgroundTaskManager;
      if (!manager) {
        return {
          llmContent:
            'Error: Background tasks are not supported in this session.',
          isError: true,
        };
      }

      try {
        const status = manager.getTaskStatus(task_id);
        const output = manager.getTaskOutput(task_id, incremental, stream);

        const llmContent = [
          `Task ID: ${task_id}`,
          `Command: ${status.command}`,
          `Status: ${status.status}`,
          `Exit Code: ${status.exitCode ?? '(still running)'}`,
          `Duration: ${status.duration ? `${status.duration}ms` : '(in progress)'}`,
          `Stdout: ${output.stdout || '(empty)'}`,
          `Stderr: ${output.stderr || '(empty)'}`,
        ].join('\n');

        const displayMessage = output.combined
          ? truncateOutput(output.combined)
          : `Task ${status.status}, no output`;

        return {
          llmContent,
          returnDisplay: displayMessage,
        };
      } catch (error) {
        return {
          llmContent:
            error instanceof Error
              ? `Error retrieving task output: ${error.message}`
              : 'Error retrieving task output',
          isError: true,
        };
      }
    },
    approval: {
      category: 'read',
      needsApproval: async () => false,
    },
  });
}
