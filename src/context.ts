import fs from 'fs';
import { memoize } from 'lodash-es';
import path from 'path';
import { getCodebaseContext } from './codebase';
import { PRODUCT_NAME } from './constants/product';
import { lsTool } from './tools/LsTool';
import { execFileNoThrow } from './utils/execFileNoThrow';

function getCwd() {
  return process.cwd();
}

export async function getDirectoryStructure() {
  const files = await lsTool.execute(
    { path: '.' },
    {
      toolCallId: 'ls',
      messages: [],
    },
  );
  return files;
}

export async function getGitStatus() {
  const isGit = await (async () => {
    const { code } = await execFileNoThrow(
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

export async function getCodeStyle() {
  const styles: string[] = [];
  let currentDir = getCwd();

  while (currentDir !== path.parse(currentDir).root) {
    const stylePath = path.join(currentDir, `${PRODUCT_NAME}.md`);
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

export async function getReadme() {
  const readmePath = path.join(getCwd(), 'README.md');
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
  codebase?: boolean | string;
}) => Promise<ContextResult> = memoize(async (opts) => {
  const directoryStructure = await getDirectoryStructure();
  const gitStatus = await getGitStatus();
  const codeStyle = await getCodeStyle();
  const readme = await getReadme();
  const codebase = opts.codebase
    ? await getCodebaseContext({
        include: typeof opts.codebase === 'string' ? opts.codebase : undefined,
      })
    : undefined;
  return {
    // TODO: ...config.context
    ...(directoryStructure ? { directoryStructure } : {}),
    ...(gitStatus ? { gitStatus } : {}),
    ...(codeStyle ? { codeStyle } : {}),
    ...(readme ? { readme } : {}),
    ...(codebase ? { codebase } : {}),
  };
});
