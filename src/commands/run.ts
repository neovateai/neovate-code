import * as p from '@umijs/clack-prompts';
import { CoreMessage } from 'ai';
import { execSync } from 'child_process';
import pc from 'picocolors';
import { askQuery } from '../llms/query';
import { Context } from '../types';
import * as logger from '../utils/logger';

// System prompt to guide AI in generating shell commands
const AI_TO_SHELL_PROMPT = `
You are a tool that converts natural language instructions into shell commands.
Your task is to transform user's natural language requests into precise and effective shell commands.

Please follow these rules:
1. Output only the shell command, without explanations or additional content
2. If the user directly provides a shell command, return that command as is
3. If the user describes a task in natural language, convert it to the most appropriate shell command
4. Avoid using potentially dangerous commands (such as rm -rf /)
5. Provide complete commands, avoiding placeholders
6. Reply with only one command, don't provide multiple options or explanations
7. When no suitable command can be found, return the recommended command directly

Examples:
User: "List all files in the current directory"
Reply: "ls -la"

User: "Create a new directory named test"
Reply: "mkdir test"

User: "Find all log files containing 'error'"
Reply: "find . -name '*.log' -exec grep -l 'error' {} \\;"

User: "ls -la" (user directly provided a command)
Reply: "ls -la"

User: "I want to compress all images in the current directory"
Reply: "find . -type f \( -iname \"*.jpg\" -o -iname \"*.jpeg\" -o -iname \"*.png\" \) -exec mogrify -quality 85% {} \\;"
`;

/**
 * Execute shell command and return the result
 */
async function executeShell(
  command: string,
  cwd: string,
): Promise<{ success: boolean; output: string }> {
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: error.message || 'Command execution failed',
    };
  }
}

/**
 * Convert natural language instructions to shell commands using AI
 */
async function aiToShellCommand(
  prompt: string,
  context: Context,
): Promise<string> {
  const systemPrompt = [AI_TO_SHELL_PROMPT];
  const messages: CoreMessage[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  // Use a smaller model to handle command conversion for faster performance
  const model = context.config.smallModel;

  const result = await askQuery({
    systemPrompt,
    messages,
    context,
    model,
  });

  return removeThoughts(result.trim());
}

function removeThoughts(message: string) {
  // e.g. gemini-2.5-pro-exp-03-25 contains <thought>...</thought>
  return message.replace(/<thought>[\s\S]*?<\/thought>/gm, '');
}

/**
 * Run shell command
 */
async function runShellCommand(opts: { context: Context; prompt: string }) {
  const { argv } = opts.context;
  let prompt = opts.prompt;

  // Use AI to convert natural language to shell command
  logger.logAction({
    message: `AI is converting natural language to shell command...`,
  });
  let command = await aiToShellCommand(prompt, opts.context);

  // Display the generated command and request confirmation
  logger.logInfo(
    `
${pc.bold(pc.blueBright('AI generated shell command:'))}
${command}
  `.trim(),
  );

  // If dry-run mode is enabled, only display the command without executing
  if (argv['dry-run']) {
    logger.logInfo('Dry run mode: Command will not be executed');
    return;
  }

  // If --yes mode is enabled, execute the command without confirmation
  if (argv.yes) {
    logger.logAction({ message: `Executing command: ${command}` });
    const result = await executeShell(command, opts.context.cwd);

    if (result.success) {
      console.log(result.output);
    } else {
      logger.logError({ error: `Command execution failed: ${result.output}` });
    }
    return;
  }

  // Default behavior: request confirmation
  const execution = await p.select({
    message: 'Confirm execution',
    options: [
      { value: 'execute', label: 'Execute' },
      { value: 'edit', label: 'Edit' },
      { value: 'cancel', label: 'Cancel' },
    ],
  });

  if (logger.isCancel(execution)) {
    logger.logInfo('Command execution cancelled');
    return;
  }

  if (execution === 'edit') {
    const editedCommand = await logger.getUserInput({
      message: 'Edit command',
      defaultValue: command,
    });

    if (editedCommand) {
      command = editedCommand;
    }

    const confirmExecution = await logger.confirm({
      message: `Execute command: ${pc.reset(pc.gray(command))}`,
      active: pc.green('Execute'),
      inactive: pc.red('Cancel'),
    });

    if (logger.isCancel(confirmExecution)) {
      logger.logInfo('Command execution cancelled');
      return;
    }
  }

  if (execution === 'cancel') {
    logger.logInfo('Command execution cancelled');
    return;
  }

  logger.logAction({ message: `Executing command: ${command}` });
  const result = await executeShell(command, opts.context.cwd);

  if (result.success) {
    logger.logInfo(result.output);
  } else {
    logger.logError({ error: `Command execution failed: ${result.output}` });
  }
}

/**
 * Run shell command
 */
export async function runRun(opts: { context: Context; prompt: string }) {
  const { argv } = opts.context;
  let prompt = opts.prompt;

  // If no command is provided, get user input
  if (!prompt || prompt.trim() === '') {
    prompt = await logger.getUserInput();
  } else {
    logger.logUserInput({ input: prompt });
  }

  // Use AI to convert natural language to shell command
  await runShellCommand({ context: opts.context, prompt });

  // If not in quiet mode, continue receiving user input
  if (!argv.quiet) {
    while (true) {
      const nextPrompt = await logger.getUserInput();
      await runShellCommand({
        context: opts.context,
        prompt: nextPrompt,
      });
    }
  }
}
