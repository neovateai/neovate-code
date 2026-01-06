import crypto from 'crypto';
import createDebug from 'debug';
import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { z } from 'zod';
import type { BackgroundTaskManager } from '../backgroundTaskManager';
import { BASH_EVENTS, TOOL_NAMES } from '../constants';
import type { MessageBus } from '../messageBus';
import { createTool } from '../tool';
import type { BashPromptBackgroundEvent } from '../ui/store';
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

const DEFAULT_TIMEOUT = 2 * 60 * 1000; // 2 minutes
const MAX_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const BACKGROUND_CHECK_INTERVAL = 500; // ms

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

  return `${visibleLines.join('\n')}\n… +${remainingCount} lines`;
}

function getCommandRoot(command: string): string | undefined {
  return command
    .trim()
    .replace(/[{}()]/g, '')
    .split(/[\s;&|]+/)[0]
    ?.split(/[/\\]/)
    .pop();
}

/**
 * Check if command contains command substitution ($() or backticks) outside of safe contexts.
 * Safe contexts:
 * - Inside single quotes (everything is literal)
 * - Escaped backticks inside double quotes
 * @internal exported for testing
 */
export function hasCommandSubstitution(command: string): boolean {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (inSingleQuote) {
      continue;
    }

    if (char === '`') {
      return true;
    }

    if (char === '$' && command[i + 1] === '(') {
      return true;
    }
  }

  return false;
}

/**
 * Split command by pipe segments, handling quoted strings correctly
 * Example: "echo 'test|value' | grep test" => ["echo 'test|value'", "grep test"]
 */
function splitPipelineSegments(command: string): string[] {
  const segments: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      current += char;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (char === '|' && !inSingleQuote && !inDoubleQuote) {
      if (current.trim()) {
        segments.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

/**
 * Check if a single command segment is high risk
 * This is used as a fallback evaluation for each pipeline segment
 */
function isSegmentHighRisk(segment: string): boolean {
  const highRiskPatterns = [
    /rm\s+.*(-rf|--recursive)/i,
    /sudo/i,
    /dd\s+if=/i,
    /mkfs/i,
    /fdisk/i,
    /format/i,
    /del\s+.*\/[qs]/i,
  ];

  if (hasCommandSubstitution(segment)) {
    return true;
  }

  const commandRoot = getCommandRoot(segment);
  if (!commandRoot) {
    return true;
  }

  return (
    highRiskPatterns.some((pattern) => pattern.test(segment)) ||
    BANNED_COMMANDS.includes(commandRoot.toLowerCase())
  );
}

/**
 * Check if command is high risk with pipeline segment fallback evaluation
 * Implements the same approach as codex PR #7544:
 * - First check the full command
 * - If command contains pipes, evaluate each segment separately
 * - If any segment is high risk, the entire command is high risk
 * @internal exported for testing
 */
export function isHighRiskCommand(command: string): boolean {
  // Legacy patterns for specific dangerous combinations
  const legacyDangerousCombinations = [/curl.*\|.*sh/i, /wget.*\|.*sh/i];

  // Quick check for legacy dangerous combinations
  if (legacyDangerousCombinations.some((pattern) => pattern.test(command))) {
    return true;
  }

  // Check if command contains pipeline
  if (command.includes('|')) {
    // Split by pipeline and evaluate each segment
    const segments = splitPipelineSegments(command);

    // Fallback evaluation: check each segment independently
    for (const segment of segments) {
      if (isSegmentHighRisk(segment)) {
        return true;
      }
    }

    return false;
  }

  // For non-pipeline commands, use segment risk check
  return isSegmentHighRisk(command);
}

function validateCommand(command: string): string | null {
  if (!command.trim()) {
    return 'Command cannot be empty.';
  }

  const commandRoot = getCommandRoot(command);
  if (!commandRoot) {
    return 'Could not identify command root.';
  }

  if (hasCommandSubstitution(command)) {
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
  messageBus: MessageBus | undefined,
  pendingBackgroundMoves: Map<string, { moveToBackground: () => void }>,
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
  const isCommandCompletedRef = { value: false };
  let backgroundCheckInterval: ReturnType<typeof setInterval> | null = null;

  let backgroundPromptEmitted = false;

  // Helper function to clear background prompt when command completes
  const clearBackgroundPromptIfNeeded = () => {
    if (backgroundPromptEmitted && messageBus && !movedToBackgroundRef.value) {
      messageBus.emitEvent(BASH_EVENTS.BACKGROUND_MOVED, {});
    }
  };

  const triggerBackgroundTransition = () => {
    if (runInBackground === true) {
      if (!movedToBackgroundRef.value) {
        movedToBackgroundRef.value = true;
        const actualTaskId = handleBackgroundTransition(
          command,
          pid,
          tempFilePath,
          isWindows,
          backgroundTaskManager,
          resultPromise,
        );
        backgroundTaskIdRef.value = actualTaskId;
      }
    } else if (messageBus) {
      const tempTaskId = `temp_${crypto.randomBytes(6).toString('hex')}`;
      pendingBackgroundMoves.set(tempTaskId, {
        moveToBackground: () => {
          movedToBackgroundRef.value = true;
          const actualTaskId = handleBackgroundTransition(
            command,
            pid,
            tempFilePath,
            isWindows,
            backgroundTaskManager,
            resultPromise,
          );
          backgroundTaskIdRef.value = actualTaskId;
        },
      });

      const promptEvent: BashPromptBackgroundEvent = {
        taskId: tempTaskId,
        command,
        currentOutput: outputBufferRef.value,
      };

      messageBus.emitEvent(BASH_EVENTS.PROMPT_BACKGROUND, promptEvent);
    }
  };

  const shouldStopCheck = () =>
    movedToBackgroundRef.value || isCommandCompletedRef.value;

  const shouldTransitionToBackground = () => {
    const elapsed = Date.now() - startTime;
    return (
      shouldRunInBackground(
        command,
        elapsed,
        hasOutput,
        isCommandCompletedRef.value,
        runInBackground,
      ) && !backgroundPromptEmitted
    );
  };

  const clearCheckInterval = () => {
    if (backgroundCheckInterval) {
      clearInterval(backgroundCheckInterval);
      backgroundCheckInterval = null;
    }
  };

  // 定时检查函数
  const startBackgroundCheck = () => {
    if (backgroundCheckInterval) return; // Avoid duplicate startup

    backgroundCheckInterval = setInterval(() => {
      if (shouldStopCheck()) {
        clearCheckInterval();
        return;
      }

      if (shouldTransitionToBackground()) {
        backgroundPromptEmitted = true;
        triggerBackgroundTransition();
        clearCheckInterval();
      }
    }, BACKGROUND_CHECK_INTERVAL);
  };

  const isWindows = os.platform() === 'win32';
  const tempFileName = `shell_pgrep_${crypto
    .randomBytes(6)
    .toString('hex')}.tmp`;
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

        // Start background check if not already started
        startBackgroundCheck();
      }
    },
  );

  // Monitor command completion
  resultPromise.finally(() => {
    isCommandCompletedRef.value = true;
    clearCheckInterval();
  });

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
      clearBackgroundPromptIfNeeded();
      return backgroundCheckResult.result;
    }
  } catch (error) {
    cleanupTempFile();
    clearBackgroundPromptIfNeeded();
    throw error;
  }

  const result = await resultPromise;
  cleanupTempFile();
  clearBackgroundPromptIfNeeded();

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
  messageBus?: MessageBus;
}) {
  const { cwd, backgroundTaskManager, messageBus } = opts;

  // Track pending background moves
  const pendingBackgroundMoves = new Map<
    string,
    { moveToBackground: () => void }
  >();

  // Add background move listener only if messageBus is available
  if (messageBus) {
    messageBus.onEvent(
      BASH_EVENTS.MOVE_TO_BACKGROUND,
      ({ taskId }: { taskId: string }) => {
        const pendingMove = pendingBackgroundMoves.get(taskId);
        if (pendingMove) {
          pendingMove.moveToBackground();
          pendingBackgroundMoves.delete(taskId);
          messageBus.emitEvent(BASH_EVENTS.BACKGROUND_MOVED, { taskId });
        }
      },
    );
  }
  return createTool({
    name: TOOL_NAMES.BASH,
    description:
      `Run shell commands in the terminal, ensuring proper handling and security measures.

Background Execution:
- Set run_in_background=true to force background execution
- Background tasks return a task_id for use with ${
        TOOL_NAMES.BASH_OUTPUT
      } and ${TOOL_NAMES.KILL_BASH} tools
- Initial output shown when moved to background

Before using this tool, please follow these steps:
- Verify that the command is not one of the banned commands: ${BANNED_COMMANDS.join(
        ', ',
      )}.
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
        .describe(`Optional timeout in milliseconds (max ${MAX_TIMEOUT})`),
      run_in_background: z
        .boolean()
        .optional()
        .describe(
          'Set to true to run this command in the background. Use bash_output to read output later.',
        ),
      description: z
        .string()
        .optional()
        .describe(`Clear, concise description of what this command does in 5-10 words, in active voice. Examples:
Input: ls
Output: List files in current directory

Input: git status
Output: Show working tree status

Input: npm install
Output: Install package dependencies

Input: mkdir foo
Output: Create directory 'foo'
          `),
    }),
    getDescription: ({ params }) => {
      if (!params.command || typeof params.command !== 'string') {
        return 'No command provided';
      }
      const command = params.command.trim();
      return command.length > 100 ? `${command.substring(0, 97)}...` : command;
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
          messageBus,
          pendingBackgroundMoves,
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
