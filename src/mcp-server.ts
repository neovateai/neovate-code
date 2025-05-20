import { execSync } from 'child_process';
import { FastMCP, UserError } from 'fastmcp';
import { existsSync } from 'fs';
import path from 'path';
import { z } from 'zod';

export interface ToolContext {
  server: FastMCP;
  root: string;
}

function getBinPath(root: string) {
  const binDir = path.join(root, 'node_modules', '.bin');
  if (existsSync(binDir)) {
    return path.join(binDir, 'takumi');
  }
  throw new UserError('takumi not found in node_modules/.bin');
}

export function registerTools(opts: ToolContext) {
  const { server, root } = opts;
  const binPath = getBinPath(root);

  server.addTool({
    name: 'takumi-help',
    description: 'Display help information for the Takumi CLI.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const result = execSync(`${binPath} help`, { cwd: root });
        return {
          type: 'text',
          text: result.toString(),
        };
      } catch (error: any) {
        return {
          type: 'text',
          text: error.message || 'Failed to display help information',
        };
      }
    },
  });

  server.addTool({
    name: 'takumi-version',
    description: 'Display the current version of Takumi CLI.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const result = execSync(`${binPath} --version`, { cwd: root });
        return {
          type: 'text',
          text: result.toString(),
        };
      } catch (error: any) {
        return {
          type: 'text',
          text: error.message || 'Failed to get version',
        };
      }
    },
  });

  server.addTool({
    name: 'takumi-ask',
    description: 'Ask questions about your codebase without modifying files.',
    parameters: z.object({
      query: z.string().describe('The question to ask about your codebase'),
      model: z.string().optional().describe('The language model to use'),
    }),
    execute: async (params) => {
      try {
        const queryArg = params.query;
        const modelArg = params.model ? `--model ${params.model}` : '';
        const command = [binPath, 'ask', modelArg, '-q', `"${queryArg}"`]
          .filter(Boolean)
          .join(' ');

        const result = execSync(command, {
          cwd: root,
          env: process.env,
        });

        return {
          type: 'text',
          text: result.toString(),
        };
      } catch (error: any) {
        console.error(`Error executing ask command: ${error.message}`);
        return {
          type: 'text',
          text: error.message || 'Failed to get answer',
        };
      }
    },
  });

  server.addTool({
    name: 'takumi-commit',
    description: 'Generate conventional commit messages from staged changes.',
    parameters: z.object({
      stage: z
        .boolean()
        .optional()
        .describe('Stage all current changes with git add .'),
      commit: z
        .boolean()
        .optional()
        .describe('Commit changes with the generated message'),
      push: z
        .boolean()
        .optional()
        .describe('Push changes after committing (requires --commit)'),
      'follow-style': z
        .boolean()
        .optional()
        .describe('Analyze recent commits and follow a similar style'),
      'no-verify': z
        .boolean()
        .optional()
        .describe('Pass --no-verify to git commit (requires --commit)'),
      language: z
        .string()
        .optional()
        .describe('Specify the language for the commit message'),
      model: z.string().optional().describe('The language model to use'),
    }),
    execute: async (params) => {
      try {
        const stageArg = params.stage ? '--stage' : '';
        const commitArg = params.commit ? '--commit' : '';
        const pushArg = params.push ? '--push' : '';
        const followStyleArg = params['follow-style'] ? '--follow-style' : '';
        const noVerifyArg = params['no-verify'] ? '--no-verify' : '';
        const languageArg = params.language
          ? `--language ${params.language}`
          : '';
        const modelArg = params.model ? `--model ${params.model}` : '';
        const command = [
          binPath,
          'commit',
          stageArg,
          commitArg,
          pushArg,
          followStyleArg,
          noVerifyArg,
          languageArg,
          modelArg,
          '-q',
        ]
          .filter(Boolean)
          .join(' ');
        const result = execSync(command, {
          cwd: root,
          env: process.env,
        });
        return {
          type: 'text',
          text: result.toString(),
        };
      } catch (error: any) {
        console.error(`Error executing commit command: ${error.message}`);
        return {
          type: 'text',
          text: error.message || 'Failed to generate commit message',
        };
      }
    },
  });

  server.addTool({
    name: 'takumi-init',
    description:
      'Analyze your project and create a TAKUMI.md file with project conventions.',
    parameters: z.object({
      model: z.string().optional().describe('The language model to use'),
    }),
    execute: async (params) => {
      try {
        const modelArg = params.model ? `--model ${params.model}` : '';
        const command = [binPath, 'init', modelArg, '-q']
          .filter(Boolean)
          .join(' ');

        const result = execSync(command, {
          cwd: root,
          env: process.env,
        });

        return {
          type: 'text',
          text: result.toString(),
        };
      } catch (error: any) {
        console.error(`Error executing init command: ${error.message}`);
        return {
          type: 'text',
          text: error.message || 'Failed to initialize project',
        };
      }
    },
  });

  server.addTool({
    name: 'takumi-test',
    description: 'Run tests with automatic AI-powered fixing of failures.',
    parameters: z.object({
      'test-cmd': z.string().optional().describe('Custom test command to run'),
      model: z.string().optional().describe('The language model to use'),
    }),
    execute: async (params) => {
      try {
        const testCmdArg = params['test-cmd']
          ? `--test-cmd "${params['test-cmd']}"`
          : '';
        const modelArg = params.model ? `--model ${params.model}` : '';
        const command = [binPath, 'test', testCmdArg, modelArg, '-q']
          .filter(Boolean)
          .join(' ');

        const result = execSync(command, {
          cwd: root,
          env: process.env,
        });

        return {
          type: 'text',
          text: result.toString(),
        };
      } catch (error: any) {
        console.error(`Error executing test command: ${error.message}`);
        return {
          type: 'text',
          text: error.message || 'Failed to run tests',
        };
      }
    },
  });

  server.addTool({
    name: 'takumi-lint',
    description: 'Run linter with automatic AI-powered fixing of errors.',
    parameters: z.object({
      'lint-cmd': z.string().optional().describe('Custom lint command to run'),
      model: z.string().optional().describe('The language model to use'),
    }),
    execute: async (params) => {
      try {
        const lintCmdArg = params['lint-cmd']
          ? `--lint-cmd "${params['lint-cmd']}"`
          : '';
        const modelArg = params.model ? `--model ${params.model}` : '';
        const command = [binPath, 'lint', lintCmdArg, modelArg, '-q']
          .filter(Boolean)
          .join(' ');

        const result = execSync(command, {
          cwd: root,
          env: process.env,
        });

        return {
          type: 'text',
          text: result.toString(),
        };
      } catch (error: any) {
        console.error(`Error executing lint command: ${error.message}`);
        return {
          type: 'text',
          text: error.message || 'Failed to run linter',
        };
      }
    },
  });

  server.addTool({
    name: 'takumi-run',
    description: 'Execute shell commands using natural language.',
    parameters: z.object({
      command: z.string().describe('The natural language command to execute'),
      model: z.string().optional().describe('The language model to use'),
      yes: z
        .boolean()
        .optional()
        .describe('Execute command without confirmation'),
    }),
    execute: async (params) => {
      try {
        const commandArg = params.command;
        const modelArg = params.model ? `--model ${params.model}` : '';
        const yesArg = params.yes ? '--yes' : '';

        const command = [
          binPath,
          'run',
          modelArg,
          yesArg,
          '-q',
          `"${commandArg}"`,
        ]
          .filter(Boolean)
          .join(' ');

        const result = execSync(command, {
          cwd: root,
          env: process.env,
        });

        return {
          type: 'text',
          text: result.toString(),
        };
      } catch (error: any) {
        console.error(`Error executing run command: ${error.message}`);
        return {
          type: 'text',
          text: error.message || 'Failed to execute command',
        };
      }
    },
  });
}
