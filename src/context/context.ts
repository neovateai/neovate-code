import fs from 'fs';
import { memoize } from 'lodash-es';
import path from 'path';
import { createLSTool } from '../tools/LsTool';
import { Context } from '../types';
import { execFileNoThrow } from '../utils/execFileNoThrow';
import { getCodebaseContext } from './codebase';
import { getFileContext, getFilesByPrompt } from './contextFiles';

export async function getDirectoryStructure(opts: { context: Context }) {
  const LSTool = createLSTool(opts);
  const files = await LSTool.execute(
    { path: '.' },
    {
      toolCallId: 'ls',
      messages: [],
    },
  );
  return files;
}

export async function getGitStatus(opts: { context: Context }) {
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
${authorLog || '(no recent commits)'}`.trim();
}

const STYLE_PROMPT =
  'The codebase follows strict style guidelines shown below. All code changes must strictly adhere to these guidelines to maintain consistency and quality.';

export async function getCodeStyle(opts: { context: Context }) {
  const styles: string[] = [];
  let currentDir = opts.context.cwd;

  while (currentDir !== path.parse(currentDir).root) {
    const stylePath = path.join(
      currentDir,
      `${opts.context.config.productName}.md`,
    );
    if (fs.existsSync(stylePath)) {
      styles.push(
        `Contents of ${stylePath}:\n\n${fs.readFileSync(stylePath, 'utf-8')}`,
      );
    }
    currentDir = path.dirname(currentDir);
  }
  if (styles.length === 0) {
    return '';
  }
  return `${STYLE_PROMPT}\n\n${styles.reverse().join('\n\n')}`;
}

export async function getReadme(opts: { context: Context }) {
  const readmePath = path.join(opts.context.cwd, 'README.md');
  if (!fs.existsSync(readmePath)) {
    return null;
  }
  return fs.readFileSync(readmePath, 'utf-8');
}

type ContextResult = {
  directoryStructure?: string;
  gitStatus?: string;
  codeStyle?: string;
  readme?: string;
};

export const getContext: (opts: {
  context: Context;
  prompt?: string;
  isUserInputPrompt?: boolean;
}) => Promise<ContextResult> = memoize(async (opts) => {
  const directoryStructure = await getDirectoryStructure({
    context: opts.context,
  });
  const gitStatus = await getGitStatus({ context: opts.context });
  const codeStyle = await getCodeStyle({ context: opts.context });
  const readme = await getReadme({ context: opts.context });
  const codebase = opts.context.argv.codebase
    ? await getCodebaseContext({
        include:
          typeof opts.context.argv.codebase === 'string'
            ? opts.context.argv.codebase
            : undefined,
        context: opts.context,
      })
    : undefined;

  // Process file references in the prompt
  const promptFiles =
    opts.isUserInputPrompt && opts.prompt
      ? await getFilesByPrompt({
          prompt: opts.prompt,
          cwd: opts.context.cwd,
        })
      : [];

  const files =
    promptFiles.length > 0 ? await getFileContext(promptFiles) : undefined;

  return {
    // TODO: ...config.context
    ...(directoryStructure ? { directoryStructure } : {}),
    ...(gitStatus ? { gitStatus } : {}),
    ...(codeStyle ? { codeStyle } : {}),
    ...(readme ? { readme } : {}),
    ...(codebase ? { codebase } : {}),
    ...(files ? { files } : {}),
  };
});
