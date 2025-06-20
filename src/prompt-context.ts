import createDebug from 'debug';
import fs from 'fs';
import path from 'path';
import { platform } from 'process';
import { getCodebaseContext } from './codebase';
import { Context } from './context';
import { IDE } from './ide';
import { PluginHookType } from './plugin';
import { createLSTool } from './tools/ls';
import { execFileNoThrow } from './utils/execFileNoThrow';

const debug = createDebug('takumi:prompt-context');

export interface PromptContextOpts {
  prompts: string[];
  context: Context;
}

export class PromptContext {
  context: Context;
  prompts: string[];
  constructor(opts: PromptContextOpts) {
    this.context = opts.context;
    this.prompts = opts.prompts;
  }

  addPrompt(prompt: string) {
    this.prompts.push(prompt);
  }

  async getContext() {
    return [await this.getEnvPrompt(), await this.getContextPrompt()].join(
      '\n\n',
    );
  }

  renderFilesToXml(files: string[]): string {
    const fileContents = files
      .map(
        (fc) => `
      <file>
        <path>${path.relative(this.context.cwd, fc)}</path>
        <content><![CDATA[${fs.readFileSync(fc, 'utf-8')}]]></content>
      </file>`,
      )
      .join('');
    return `<files>This section contains the contents of the repository's files.\n${fileContents}\n</files>`;
  }

  getAllFilesInDirectory(dirPath: string): string[] {
    const files: string[] = [];

    const traverse = (currentPath: string) => {
      try {
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
          const itemPath = path.join(currentPath, item);
          const stat = fs.statSync(itemPath);

          if (stat.isFile()) {
            files.push(itemPath);
          } else if (stat.isDirectory()) {
            // Skip hidden directories and common ignore patterns
            if (
              !item.startsWith('.') &&
              !['node_modules', 'dist', 'build'].includes(item)
            ) {
              traverse(itemPath);
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
        console.warn(`Warning: Could not read directory ${currentPath}`);
      }
    };

    traverse(dirPath);
    return files;
  }

  async parsePrompt(prompt: string) {
    const ats = prompt
      .split(' ')
      .filter((p) => p.startsWith('@'))
      .map((p) => p.slice(1));
    const uniqAts = [...new Set(ats)];
    const ret: Record<string, string> = {};
    const files: string[] = [];

    for (const at of uniqAts) {
      switch (at) {
        case 'codebase':
          ret.codebase = await getCodebaseContext({
            context: this.context,
          });
          break;
        default:
          const filePath = path.resolve(this.context.cwd, at);
          if (fs.existsSync(filePath)) {
            if (fs.statSync(filePath).isFile()) {
              files.push(filePath);
            } else if (fs.statSync(filePath).isDirectory()) {
              const dirFiles = this.getAllFilesInDirectory(filePath);
              files.push(...dirFiles);
            } else {
              throw new Error(`${filePath} is not a file or directory`);
            }
          }
          break;
      }
    }
    if (files.length > 0) {
      ret.files = this.renderFilesToXml(files);
    }
    return ret;
  }

  async getIDEPromptData() {
    const ide = new IDE();
    const port = ide.findPort();
    if (!port) return {};

    try {
      await ide.connect();
    } catch (e) {
      debug('Failed to connect to IDE');
      return {};
    }
    const workspaceFolders = await ide.getWorkspaceFolders();
    const openEditors = await ide.getOpenEditors();
    // const diagnostics = await ide.getDiagnostics();
    const currentSelection = await ide.getCurrentSelection();
    await ide.disconnect();
    return {
      IDEWorkspaceFolders: JSON.stringify(workspaceFolders),
      IDEOpenEditors: JSON.stringify(openEditors),
      IDECurrentSelection: JSON.stringify(currentSelection),
    };
  }

  async getContextPromptData() {
    const ideData = await this.getIDEPromptData();
    return {
      directoryStructure: await getDirectoryStructure({
        context: this.context,
      }),
      gitStatus: (await getGitStatus({ context: this.context })) ?? '',
      codeStyle: (await getCodeStyle({ context: this.context })) ?? '',
      readme: (await getReadme({ context: this.context })) ?? '',
      ...ideData,
      ...(await this.parsePrompt(this.prompts.join(' '))),
    };
  }

  async getContextPrompt() {
    await this.context.apply({
      hook: 'contextStart',
      args: [{ prompt: this.prompts.join(' ') }],
      type: PluginHookType.Series,
    });
    let promptContext = await this.getContextPromptData();
    promptContext = await this.context.apply({
      hook: 'context',
      args: [{ prompt: this.prompts.join(' ') }],
      memo: promptContext,
      type: PluginHookType.SeriesMerge,
    });
    const prompt = Object.entries(promptContext)
      .map(([key, value]) => `<context name="${key}">${value}</context>`)
      .join('\n');
    return `
# Context
As you answer the user's questions, you can use the following context:
${prompt}
    `.trim();
  }

  async getEnvPrompt() {
    const gitStatus = await getGitStatus({ context: this.context });
    return `
# Environment
Here is useful information about the environment you are running in.
<env>
Working directory: ${this.context.cwd}
Is directory a git repo: ${gitStatus ? 'YES' : 'NO'}
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
