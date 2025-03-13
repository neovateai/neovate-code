import { tool } from 'ai';
import { execSync } from 'child_process';
import { z } from 'zod';

const MAX_OUTPUT_LENGTH = 30000;
const BANNED_COMMANDS = [
  'alias',
  'curl',
  'curlie',
  'wget',
  'axel',
  'aria2c',
  'nc',
  'telnet',
  'lynx',
  'w3m',
  'links',
  'httpie',
  'xh',
  'http-prompt',
  'chrome',
  'firefox',
  'safari',
];

export const bashTool = tool({
  description: `
You are a command line tool that can execute commands in the terminal.

Before using this tool, please follow these steps:

1. Security Check:
   - Verify that the command is not one of the banned commands: ${BANNED_COMMANDS.join(', ')}.

2. Usage notes:
  - The command argument is required.
  - You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes). If not specified, commands will timeout after 30 minutes.
  - VERY IMPORTANT: You MUST avoid using search commands like \`find\` and \`grep\`. Instead use GrepTool, GlobTool, or AgentTool to search. You MUST avoid read tools like \`cat\`, \`head\`, \`tail\`, and \`ls\`, and use FileReadTool and LSTool to read files.
  - When issuing multiple commands, use the ';' or '&&' operator to separate them. DO NOT use newlines (newlines are ok in quoted strings).
  - IMPORTANT: All commands share the same shell session. Shell state (environment variables, virtual environments, current directory, etc.) persist between commands.
  - Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`. You may use \`cd\` if the User explicitly requests it.
  <good-example>
  pytest /foo/bar/tests
  </good-example>
  <bad-example>
  cd /foo/bar && pytest tests
  </bad-example>
  `,
  parameters: z.object({
    command: z.string().describe('The command to execute'),
    timeout: z
      .number()
      .optional()
      .describe('Optional timeout in milliseconds (max 600000)'),
  }),
  execute: async ({ command, timeout = 1800000 }) => {
    console.log(`[BashTool] Executing command: ${command}`);
    const result = execSync(command, { timeout });
    return result.toString();
  },
});
