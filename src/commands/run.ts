import { CoreMessage } from 'ai';
import { execSync } from 'child_process';
import pc from 'picocolors';
import { askQuery } from '../llm/query';
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

Examples:
User: "List all files in the current directory"
Reply: "ls -la"

User: "Create a new directory named test"
Reply: "mkdir test"

User: "Find all log files containing 'error'"
Reply: "find . -name '*.log' -exec grep -l 'error' {} \\;"

User: "ls -la" (user directly provided a command)
Reply: "ls -la"
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

  return result.trim();
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
  logger.logAction({
    message: `AI is converting natural language to shell command...`,
  });
  const command = await aiToShellCommand(prompt, opts.context);

  // Display the generated command and request confirmation
  const confirmExecution = await logger.confirm({
    message: `
${pc.bold(pc.blueBright('AI generated shell command:'))}
${pc.reset(pc.dim(command))}
    `.trim(),
    active: pc.green('Execute'),
    inactive: pc.red('Cancel'),
  });

  if (confirmExecution) {
    // Execute the generated command
    logger.logAction({ message: `Executing command: ${command}` });
    const result = await executeShell(command, opts.context.cwd);

    if (result.success) {
      console.log(result.output);
    } else {
      logger.logError({ error: `Command execution failed: ${result.output}` });
    }
  } else {
    logger.logInfo('Command execution cancelled');
  }

  // If not in quiet mode, continue receiving user input
  if (!argv.quiet) {
    while (true) {
      const nextPrompt = await logger.getUserInput();
      await runRun({
        context: opts.context,
        prompt: nextPrompt,
      });
    }
  }
}
