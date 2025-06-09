import fs from 'fs';
import path from 'path';
import { platform } from 'process';
import { execFileNoThrow } from '../utils/execFileNoThrow';
import { createLSTool } from './tools/ls';

interface ContextOpts {
  cwd: string;
  model: string;
  smallModel?: string;
  productName?: string;
}

export class Context {
  cwd: string;
  model: string;
  smallModel: string;
  productName: string;
  constructor(opts: ContextOpts) {
    this.cwd = opts.cwd;
    this.model = opts.model;
    this.smallModel = opts.smallModel || opts.model;
    this.productName = opts.productName || 'TAKUMI';
  }
}

export class PromptContext {
  context: Context;
  contextPromptData?: Record<string, string | null>;
  constructor(context: Context) {
    this.context = context;
  }

  async init() {
    this.contextPromptData = await this.getContextPromptData();
  }

  getContext() {
    return [this.getEnvPrompt(), this.getContextPrompt()].join('\n\n');
  }

  async getContextPromptData() {
    return {
      directoryStructure: await getDirectoryStructure({
        context: this.context,
      }),
      gitStatus: (await getGitStatus({ context: this.context })) ?? '',
      codeStyle: (await getCodeStyle({ context: this.context })) ?? '',
      readme: (await getReadme({ context: this.context })) ?? '',
    };
  }

  getContextPrompt() {
    const promptContext = this.contextPromptData!;
    const prompt = Object.entries(promptContext)
      .map(([key, value]) => `<context name="${key}">${value}</context>`)
      .join('\n');
    return `
# Context
As you answer the user's questions, you can use the following context:
${prompt}
    `.trim();
  }

  getEnvPrompt() {
    return `
# Environment
Here is useful information about the environment you are running in.
<env>
Working directory: ${this.context.cwd}
Is directory a git repo: ${this.contextPromptData!.gitStatus ? 'YES' : 'NO'}
Platform: ${platform}
Today's date: ${new Date().toLocaleDateString()}
</env>
    `.trim();
  }
}

async function getCodeStyle(opts: { context: Context }) {
  const styles: string[] = [];
  let currentDir = opts.context.cwd;

  while (currentDir !== path.parse(currentDir).root) {
    const stylePath = path.join(currentDir, `${opts.context.productName}.md`);
    if (fs.existsSync(stylePath)) {
      styles.push(
        `Contents of ${stylePath}:\n${fs.readFileSync(stylePath, 'utf-8')}`,
      );
    }
    currentDir = path.dirname(currentDir);
  }
  if (styles.length === 0) {
    return '';
  }
  return `
The codebase follows strict style guidelines shown below. All code changes must strictly adhere to these guidelines to maintain consistency and quality.

${styles.reverse().join('\n\n')}`;
}

async function getGitStatus(opts: { context: Context }) {
  const isGit = await (async () => {
    const { code } = await execFileNoThrow(
      opts.context.cwd,
      'git',
      ['rev-parse', '--is-inside-work-tree'],
      undefined,
      undefined,
      false,
    );
    return code === 0;
  })();
  if (!isGit) {
    return null;
  }
  const branch = await (async () => {
    const { stdout } = await execFileNoThrow(
      opts.context.cwd,
      'git',
      ['branch', '--show-current'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim();
  })();
  const mainBranch = await (async () => {
    const { stdout } = await execFileNoThrow(
      opts.context.cwd,
      'git',
      ['rev-parse', '--abbrev-ref', 'origin/HEAD'],
      undefined,
      undefined,
      false,
    );
    return stdout.replace('origin/', '').trim();
  })();
  const status = await (async () => {
    const { stdout } = await execFileNoThrow(
      opts.context.cwd,
      'git',
      ['status', '--short'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim();
  })();
  const log = await (async () => {
    const { stdout } = await execFileNoThrow(
      opts.context.cwd,
      'git',
      ['log', '--oneline', '-n', '5'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim();
  })();
  const author = await (async () => {
    const { stdout } = await execFileNoThrow(
      opts.context.cwd,
      'git',
      ['config', 'user.email'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim();
  })();
  const authorLog = await (async () => {
    const { stdout } = await execFileNoThrow(
      opts.context.cwd,
      'git',
      ['log', '--author', author, '--oneline', '-n', '5'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim();
  })();
  return `
This is the git status at the start of the conversation. Note that this status is a snapshot in time, and will not update during the conversation.
Current branch: ${branch}

Main branch (you will usually use this for PRs): ${mainBranch}

Status:
${status || '(clean)'}

Recent commits:
${log}

Your recent commits:
${authorLog || '(no recent commits)'}
  `.trim();
}

async function getReadme(opts: { context: Context }) {
  const readmePath = path.join(opts.context.cwd, 'README.md');
  if (!fs.existsSync(readmePath)) {
    return null;
  }
  return fs.readFileSync(readmePath, 'utf-8');
}

async function getDirectoryStructure(opts: { context: Context }) {
  const LSTool = createLSTool(opts);
  const files = await LSTool.invoke(
    null as any,
    JSON.stringify({ dir_path: '.' }),
  );
  return files;
}
