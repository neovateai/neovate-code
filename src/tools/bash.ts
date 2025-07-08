import { tool } from '@openai/agents';
import { z } from 'zod';
import { Context } from '../context';
import { ApprovalContext, EnhancedTool, enhanceTool } from '../tool';
import { EnhancedExecutor } from '../utils/EnhancedExecutor';

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
        try {
          const result = await EnhancedExecutor.executeCommand(
            command,
            timeout || DEFAULT_TIMEOUT,
            opts.context.cwd,
          );
          return {
            success: result.success,
            message: result.stdout.trim() || 'Command executed successfully',
            command,
            timeout: timeout || DEFAULT_TIMEOUT,
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
          };
        } catch (error: any) {
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            command,
            timeout: timeout || DEFAULT_TIMEOUT,
            exitCode: error?.exitCode || 1,
            stdout: error?.stdout || '',
            stderr: error?.stderr || '',
          };
        }
      },
    }),
    {
      category: 'command',
      riskLevel: 'high',
      needsApproval: async (context: ApprovalContext) => {
        const { params, approvalMode } = context;
        const command = params.command as string;

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
