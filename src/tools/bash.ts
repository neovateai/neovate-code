import crypto from 'crypto';
import createDebug from 'debug';
import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { z } from 'zod';
import type { BackgroundTaskManager } from '../backgroundTaskManager';
import { TOOL_NAMES } from '../constants';
import { createTool } from '../tool';
import { shouldRunInBackground } from '../utils/background-detection';
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
 * Truncate output by line count, showing maximum 20 lines
 */
function truncateOutput(output: string, maxLines: number = 20): string {
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

  return null;
}

function extractBackgroundPIDs(
  tempFilePath: string,
  mainPid: number | null | undefined,
  isWindows: boolean,
): number[] {
  if (isWindows || !fs.existsSync(tempFilePath)) {
    return [];
  }

  const pgrepLines = fs
    .readFileSync(tempFilePath, 'utf8')
    .split('\n')
    .filter(Boolean);

  const backgroundPIDs: number[] = [];
  for (const line of pgrepLines) {
    if (/^\d+$/.test(line)) {
      const pgrepPid = Number(line);
      if (pgrepPid !== mainPid) {
        backgroundPIDs.push(pgrepPid);
      }
    }
  }

  return backgroundPIDs;
}

function createBackgroundResult(
  command: string,
  backgroundTaskId: string,
  outputBuffer: string,
) {
  const truncated = truncateOutput(outputBuffer);
  return {
    shouldReturn: true,
    result: {
      llmContent: [
        'Command has been moved to background execution.',
        `Task ID: ${backgroundTaskId}`,
        `Command: ${command}`,
        '',
        'Initial output:',
        truncated,
        '',
        'Use bash_output tool with task_id to read further output.',
        'Use kill_bash tool with task_id to terminate the task.',
      ].join('\n'),
      backgroundTaskId,
    },
  };
}

function createBackgroundCheckPromise(
  movedToBackgroundRef: { value: boolean },
  backgroundTaskIdRef: { value: string | undefined },
  outputBufferRef: { value: string },
  command: string,
  resultPromise: Promise<any>,
) {
  return new Promise<{ shouldReturn: boolean; result: any }>((resolve) => {
    let checkInterval: NodeJS.Timeout | null = null;

    checkInterval = setInterval(() => {
      if (movedToBackgroundRef.value && backgroundTaskIdRef.value) {
        if (checkInterval) clearInterval(checkInterval);
        resolve(
          createBackgroundResult(
            command,
            backgroundTaskIdRef.value,
            outputBufferRef.value,
          ),
        );
      }
    }, 100);

    resultPromise
      .then(() => {
        if (checkInterval) clearInterval(checkInterval);
        if (!movedToBackgroundRef.value) {
          resolve({ shouldReturn: false, result: null });
        }
      })
      .catch(() => {
        if (checkInterval) clearInterval(checkInterval);
        resolve({ shouldReturn: false, result: null });
      });
  });
}

function handleBackgroundTransition(
  command: string,
  pid: number | null | undefined,
  tempFilePath: string,
  isWindows: boolean,
  backgroundTaskManager: BackgroundTaskManager,
  resultPromise: Promise<any>,
): string {
  const backgroundPIDs = extractBackgroundPIDs(tempFilePath, pid, isWindows);
  const pgid =
    backgroundPIDs.length > 0 ? backgroundPIDs[0] : (pid ?? undefined);
  const backgroundTaskId = backgroundTaskManager.createTask({
    command,
    pid: pid ?? 0,
    pgid,
  });

  resultPromise.then((result) => {
    const status = result.cancelled
      ? 'killed'
      : result.exitCode === 0
        ? 'completed'
        : 'failed';
    backgroundTaskManager.updateTaskStatus(
      backgroundTaskId,
      status,
      result.exitCode,
    );
  });

  return backgroundTaskId;
}

function formatExecutionResult(
  result: any,
  command: string,
  wrappedCommand: string,
  cwd: string,
  backgroundPIDs: number[],
): { llmContent: string; returnDisplay: string } {
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
      `Error: ${finalError}`,
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

  return { llmContent, returnDisplay: message };
}

async function executeCommand(
  command: string,
  timeout: number,
  cwd: string,
  runInBackground: boolean | undefined,
  backgroundTaskManager: BackgroundTaskManager,
) {
  const actualTimeout = Math.min(timeout, MAX_TIMEOUT);

  const validationError = validateCommand(command);
  if (validationError) {
    return {
      isError: true,
      llmContent: validationError,
    };
  }

  const startTime = Date.now();
  let hasOutput = false;
  const outputBufferRef = { value: '' };
  const movedToBackgroundRef = { value: false };
  const backgroundTaskIdRef: { value: string | undefined } = {
    value: undefined,
  };

  const isWindows = os.platform() === 'win32';
  const tempFileName = `shell_pgrep_${crypto.randomBytes(6).toString('hex')}.tmp`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  const wrappedCommand = isWindows
    ? command
    : (() => {
        let cmd = command.trim();
        if (!cmd.endsWith('&')) cmd += ';';
        return `{ ${cmd} }; __code=$?; pgrep -g 0 >${tempFilePath} 2>&1; exit $__code;`;
      })();

  debug('wrappedCommand', wrappedCommand);

  const cleanupTempFile = () => {
    try {
      if (!isWindows && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch {
      // Ignore cleanup errors
    }
  };

  const { result: resultPromise, pid } = shellExecute(
    wrappedCommand,
    cwd,
    actualTimeout,
    (event) => {
      if (movedToBackgroundRef.value) {
        if (event.type === 'data' && backgroundTaskIdRef.value) {
          backgroundTaskManager.appendOutput(
            backgroundTaskIdRef.value,
            event.chunk,
          );
        }
        return;
      }

      if (event.type === 'data') {
        hasOutput = true;
        outputBufferRef.value += event.chunk;

        const elapsed = Date.now() - startTime;
        if (
          shouldRunInBackground(command, elapsed, hasOutput, runInBackground)
        ) {
          movedToBackgroundRef.value = true;
          backgroundTaskIdRef.value = handleBackgroundTransition(
            command,
            pid,
            tempFilePath,
            isWindows,
            backgroundTaskManager,
            resultPromise,
          );
        }
      }
    },
  );

  try {
    const backgroundCheckResult = await Promise.race([
      createBackgroundCheckPromise(
        movedToBackgroundRef,
        backgroundTaskIdRef,
        outputBufferRef,
        command,
        resultPromise,
      ),
      resultPromise.then(() => ({ shouldReturn: false, result: null })),
    ]);

    if (backgroundCheckResult.shouldReturn) {
      cleanupTempFile();
      return backgroundCheckResult.result;
    }
  } catch (error) {
    cleanupTempFile();
    throw error;
  }

  const result = await resultPromise;
  cleanupTempFile();

  const backgroundPIDs = extractBackgroundPIDs(
    tempFilePath,
    result.pid,
    isWindows,
  );
  if (!isWindows && fs.existsSync(tempFilePath)) {
    const pgrepLines = fs
      .readFileSync(tempFilePath, 'utf8')
      .split('\n')
      .filter(Boolean);
    for (const line of pgrepLines) {
      if (!/^\d+$/.test(line)) {
        console.error(`pgrep: ${line}`);
      }
    }
  }

  return formatExecutionResult(
    result,
    command,
    wrappedCommand,
    cwd,
    backgroundPIDs,
  );
}

export function createBashOutputTool(opts: {
  backgroundTaskManager: BackgroundTaskManager;
}) {
  const { backgroundTaskManager } = opts;

  return createTool({
    name: TOOL_NAMES.BASH_OUTPUT,
    description: `Retrieve output from a background bash task.

Usage:
- Accepts a task_id parameter to identify the background task
- Returns the accumulated stdout and stderr output
- Shows current task status (running/completed/killed/failed)
- Use this to monitor or check output from long-running background tasks
- Task IDs are returned when commands are moved to background`,
    parameters: z.object({
      task_id: z.string().describe('The ID of the background task'),
    }),
    getDescription: ({ params }) => {
      if (!params.task_id || typeof params.task_id !== 'string') {
        return 'Read background task output';
      }
      return `Read output from task: ${params.task_id}`;
    },
    execute: async ({ task_id }) => {
      const task = backgroundTaskManager.getTask(task_id);
      if (!task) {
        return {
          isError: true,
          llmContent: `Task ${task_id} not found. Use bash tool to see available tasks.`,
        };
      }

      const lines = [
        `Command: ${task.command}`,
        `Status: ${task.status}`,
        `PID: ${task.pid}`,
        `Created: ${new Date(task.createdAt).toISOString()}`,
        '',
        'Output:',
        task.output || '(no output yet)',
      ];

      if (task.exitCode !== null) {
        lines.push('', `Exit Code: ${task.exitCode}`);
      }

      return {
        llmContent: lines.join('\n'),
      };
    },
    approval: {
      category: 'read',
      needsApproval: async () => false,
    },
  });
}

export function createKillBashTool(opts: {
  backgroundTaskManager: BackgroundTaskManager;
}) {
  const { backgroundTaskManager } = opts;

  return createTool({
    name: TOOL_NAMES.KILL_BASH,
    description: `Terminate a running background bash task.

Usage:
- Accepts a task_id parameter to identify the task to kill
- Sends SIGTERM first, then SIGKILL if needed (Unix-like systems)
- Returns success or failure status
- Use this when you need to stop a long-running background task`,
    parameters: z.object({
      task_id: z
        .string()
        .describe('The ID of the background task to terminate'),
    }),
    getDescription: ({ params }) => {
      if (!params.task_id || typeof params.task_id !== 'string') {
        return 'Terminate background task';
      }
      return `Terminate task: ${params.task_id}`;
    },
    execute: async ({ task_id }) => {
      const task = backgroundTaskManager.getTask(task_id);
      if (!task) {
        return {
          isError: true,
          llmContent: `Task ${task_id} not found. Use bash tool to see available tasks.`,
        };
      }

      if (task.status !== 'running') {
        return {
          isError: true,
          llmContent: `Task ${task_id} is not running (status: ${task.status}). Cannot terminate.`,
        };
      }

      const success = await backgroundTaskManager.killTask(task_id);
      return {
        llmContent: success
          ? `Successfully terminated task ${task_id} (${task.command})`
          : `Failed to terminate task ${task_id}. Process may have already exited.`,
        isError: !success,
      };
    },
    approval: {
      category: 'command',
      needsApproval: async (context) => {
        return context.approvalMode !== 'yolo';
      },
    },
  });
}

export function createBashTool(opts: {
  cwd: string;
  backgroundTaskManager: BackgroundTaskManager;
}) {
  const { cwd, backgroundTaskManager } = opts;
  return createTool({
    name: TOOL_NAMES.BASH,
    description:
      `Run shell commands in the terminal, ensuring proper handling and security measures.

Background Execution:
- Set run_in_background=true to force background execution
- Background tasks return a task_id for use with ${TOOL_NAMES.BASH_OUTPUT} and ${TOOL_NAMES.KILL_BASH} tools
- Initial output shown when moved to background

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
        .describe(
          'Set to true to run this command in the background. Use bash_output to read output later.',
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
      run_in_background,
    }) => {
      try {
        if (!command) {
          return {
            llmContent: 'Error: Command cannot be empty.',
            isError: true,
          };
        }
        return await executeCommand(
          command,
          timeout || DEFAULT_TIMEOUT,
          cwd,
          run_in_background,
          backgroundTaskManager,
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
