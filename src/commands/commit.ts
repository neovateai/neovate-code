import * as p from '@umijs/clack-prompts';
import { execSync, spawnSync } from 'child_process';
import clipboardy from 'clipboardy';
import pc from 'picocolors';
import { askQuery } from '../llms/query';
import { Context } from '../types';
import * as logger from '../utils/logger';

// Constants
const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB buffer
const MAX_DIFF_SIZE = 100 * 1024; // 100KB
const MAX_COMMIT_LENGTH = 90;
const MAX_ATTEMPTS = 3;

export async function runCommit(opts: { context: Context }) {
  // Validate git environment
  validateGitEnvironment();

  const argv = opts.context.argv;

  // Check for changes
  const hasChanges = checkForChanges();
  if (!hasChanges) {
    throw new Error('No changes to commit');
  }

  // Stage changes if requested
  if (argv.stage) {
    execSync('git add .');
  }

  // Get staged diff
  const diff = await getStagedDiff();
  if (diff.length === 0) {
    throw new Error('No changes to commit');
  }

  // Get repository style if requested
  const repoStyle = argv.followStyle ? getRepoStyle() : '';

  // Generate commit message
  const message = await generateCommitMessage(diff, repoStyle, opts.context);

  // Handle interactive or non-interactive mode
  const isNonInteractiveParam =
    argv.stage || argv.commit || argv.noVerify || argv.copy;
  if (argv.interactive && !isNonInteractiveParam) {
    await handleInteractiveMode(message, opts.context);
  } else {
    // Non-interactive mode logic
    if (argv.commit) {
      await commitChanges(message, argv.noVerify);
      if (argv.push) {
        await pushChanges();
      }
    }
    if (argv.copy) {
      copyToClipboard(message);
    }
  }
}

function validateGitEnvironment(): void {
  try {
    execSync('git --version', { stdio: 'ignore' });
    execSync('git config user.name', { stdio: 'ignore' });
    execSync('git config user.email', { stdio: 'ignore' });
  } catch (error: any) {
    if (error.message.includes('user.name')) {
      throw new Error(
        'Git user name is not configured. Please run: git config --global user.name "Your Name"',
      );
    } else if (error.message.includes('user.email')) {
      throw new Error(
        'Git user email is not configured. Please run: git config --global user.email "your.email@example.com"',
      );
    } else {
      throw new Error('Git is not installed or not available in PATH');
    }
  }
}

function checkForChanges(): boolean {
  const statusResult = spawnSync('git', ['status', '--porcelain'], {
    maxBuffer: MAX_BUFFER_SIZE,
  });

  if (
    statusResult.error &&
    'code' in statusResult.error &&
    statusResult.error.code === 'ENOBUFS'
  ) {
    throw new Error(
      'Repository status is too large to process. Try working in a smaller repository.',
    );
  }

  return (statusResult.stdout?.toString().trim().length ?? 0) > 0;
}

function getRepoStyle(): string {
  try {
    const recentCommits = execSync(
      'git log -n 10 --pretty=format:"%s"',
    ).toString();
    return `
# Recent commits in this repository:
${recentCommits}
Please follow a similar style for this commit message while still adhering to the structure guidelines.
`;
  } catch (error) {
    logger.logError({
      error: 'Could not analyze repository commit style. Using default style.',
    });
    return '';
  }
}

async function generateCommitMessage(
  diff: string,
  repoStyle: string,
  context: Context,
): Promise<string> {
  let message = '';
  let attempts = 0;
  const systemPrompt = [COMMIT_PROMPT];

  if (context.argv.language) {
    systemPrompt.push(`
Use ${context.argv.language} to generate the commit message.
`);
  }

  while (attempts < MAX_ATTEMPTS) {
    try {
      message = await askQuery({
        systemPrompt,
        prompt: `
# Diffs:
${diff}
${repoStyle}
        `,
        context,
      });
      message = removeThoughts(message);
      checkCommitMessage(message);
      return message;
    } catch (error: any) {
      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        throw error;
      } else {
        logger.logWarn(
          `Attempt to generate commit message failed since ${error.message}. Retrying...`,
        );
      }
    }
  }

  throw new Error('Failed to generate commit message after multiple attempts');
}

function copyToClipboard(message: string): void {
  clipboardy.writeSync(message);
  logger.logResult('Commit message copied to clipboard');
}

async function commitChanges(
  message: string,
  skipHooks = false,
): Promise<void> {
  const noVerify = skipHooks ? '--no-verify' : '';
  logger.logAction({ message: 'Commit the changes.' });
  execSync(`git commit -m "${message}" ${noVerify}`);
  logger.logResult('Commit message committed');
}

async function pushChanges(): Promise<void> {
  const hasRemote = execSync('git remote').toString().trim().length > 0;
  if (!hasRemote) {
    logger.logWarn('No remote repository configured, cannot push');
    return;
  }

  try {
    logger.logAction({
      message: 'Push changes to remote repository.',
    });
    execSync('git push');
    logger.logResult('Changes pushed to remote repository');
  } catch (error) {
    logger.logError({ error: 'Push changes failed' });
  }
}

async function handleInteractiveMode(
  message: string,
  context: Context,
): Promise<void> {
  logger.logResult(`Generated commit message: ${pc.cyan(message)}`);

  const action = await p.select({
    message: pc.bold(
      pc.blueBright('What do you want to do with this commit message?'),
    ),
    options: [
      { label: 'Copy to clipboard', value: 'copy' },
      { label: 'Commit changes', value: 'commit' },
      { label: 'Commit and push changes', value: 'push' },
      { label: 'Edit commit message', value: 'edit' },
      { label: 'Cancel', value: 'cancel' },
    ],
  });

  if (p.isCancel(action)) {
    logger.logAction({ message: 'Operation cancelled' });
    return;
  }

  switch (action) {
    case 'copy':
      copyToClipboard(message);
      break;

    case 'commit':
      await commitChanges(message);
      break;

    case 'push': {
      const skipHooksResult = await p.confirm({
        message: pc.bold(pc.blueBright('Should pre-commit hooks be skipped?')),
        active: 'Yes',
        inactive: 'No',
        initialValue: false,
      });

      if (p.isCancel(skipHooksResult)) {
        logger.logAction({ message: 'Operation cancelled' });
        return;
      }

      await commitChanges(message, skipHooksResult);
      await pushChanges();
      break;
    }

    case 'edit': {
      const editedMessage = await p.text({
        message: pc.bold(pc.blueBright('Edit the commit message:')),
        initialValue: message,
      });

      if (p.isCancel(editedMessage)) {
        logger.logAction({ message: 'Operation cancelled' });
        return;
      }

      await handleInteractiveMode(editedMessage, context);
      break;
    }

    case 'cancel':
      logger.logAction({ message: 'Operation cancelled' });
      break;
  }
}

function checkCommitMessage(message: string): void {
  if (message.length > MAX_COMMIT_LENGTH) {
    throw new Error(`Commit message is too long: ${message}`);
  }
  if (message.length === 0) {
    throw new Error('Commit message is empty');
  }
}

function removeThoughts(message: string): string {
  // Remove <thought>...</thought> tags (e.g., from gemini models)
  message = message.replace(/<thought>[\s\S]*?<\/thought>/gm, '');

  // Handle newline-separated thoughts (e.g., from Claude models)
  if (message.includes('\n')) {
    return message.split('\n').pop() || message;
  }

  return message;
}

const COMMIT_PROMPT = `
You are an expert software engineer that generates concise, \
one-line Git commit messages based on the provided diffs.
Review the provided context and diffs which are about to be committed to a git repo.
Review the diffs carefully.
Generate a one-line commit message for those changes.
The commit message should be structured as follows: <type>: <description>
Use these for <type>: fix, feat, build, chore, ci, docs, style, refactor, perf, test

Ensure the commit message:
- Starts with the appropriate prefix.
- Is in the imperative mood (e.g., \"add feature\" not \"added feature\" or \"adding feature\").
- Does not exceed 72 characters.

Reply only with the one-line commit message, without any additional text, explanations, \
or line breaks.

## Guidelines
  - Use present tense, like "add feature" instead of "added feature"
  - Do not capitalize the first letter
  - Do not end with a period
  - Keep it concise and direct, describing the change content
  - Please do not overthink, directly generate commit text that follows the specification
  - Must strictly adhere to the above standards, without adding any personal explanations or suggestions
`;

/**
 * Get the staged diff while handling large files
 * - Excludes common lockfiles and large file types
 * - Limits diff size to prevent context overflow
 */
async function getStagedDiff(): Promise<string> {
  // Exclude lockfiles and common large file types
  const excludePatterns = [
    ':!pnpm-lock.yaml',
    ':!package-lock.json',
    ':!yarn.lock',
    ':!*.min.js',
    ':!*.bundle.js',
    ':!dist/**',
    ':!build/**',
    ':!*.gz',
    ':!*.zip',
    ':!*.tar',
    ':!*.tgz',
    ':!*.woff',
    ':!*.woff2',
    ':!*.ttf',
    ':!*.png',
    ':!*.jpg',
    ':!*.jpeg',
    ':!*.gif',
    ':!*.ico',
    ':!*.svg',
    ':!*.pdf',
  ].join(' ');

  // Get the diff with exclusions
  const diffArgs = ['diff', '--cached', '--'];
  diffArgs.push(...excludePatterns.split(' ').filter(Boolean));

  const result = spawnSync('git', diffArgs, {
    maxBuffer: MAX_BUFFER_SIZE,
  });

  if (
    result.error &&
    'code' in result.error &&
    result.error.code === 'ENOBUFS'
  ) {
    throw new Error(
      'Diff is too large to process. Try committing smaller changes.',
    );
  }

  const diff = result.stdout?.toString() || '';

  if (diff.length > MAX_DIFF_SIZE) {
    // If diff is too large, truncate and add a note
    const truncatedDiff = diff.substring(0, MAX_DIFF_SIZE);
    return (
      truncatedDiff +
      '\n\n[Diff truncated due to size. Total diff size: ' +
      (diff.length / 1024).toFixed(2) +
      'KB]'
    );
  }

  return diff;
}
