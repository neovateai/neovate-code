import { execSync } from 'child_process';
import clipboardy from 'clipboardy';
import { askQuery } from '../llm/query';
import { Context } from '../types';
import * as logger from '../utils/logger';

export async function runCommit(opts: { context: Context }) {
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
  const argv = opts.context.argv;
  const hasChanged =
    execSync('git status --porcelain').toString().trim().length > 0;
  if (!hasChanged) {
    throw new Error('No changes to commit');
  }
  if (argv.stage) {
    execSync('git add .');
  }
  const diff = await getStagedDiff();
  if (diff.length === 0) {
    throw new Error('No changes to commit');
  }

  let repoStyle = '';
  if (argv.followStyle) {
    try {
      const recentCommits = execSync(
        'git log -n 10 --pretty=format:"%s"',
      ).toString();
      repoStyle = `
# Recent commits in this repository:
${recentCommits}
Please follow a similar style for this commit message while still adhering to the structure guidelines.
`;
    } catch (error) {
      logger.logError({
        error:
          'Could not analyze repository commit style. Using default style.',
      });
    }
  }

  // Generate the commit message
  let message = '';
  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    try {
      message = await askQuery({
        systemPrompt: [COMMIT_PROMPT],
        prompt: `
# Diffs:
${diff}
${repoStyle}
        `,
        context: opts.context,
      });
      message = removeThoughts(message);
      checkCommitMessage(message);
      break;
    } catch (error: any) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw error;
      }
      logger.logWarn(
        `Attempt to generate commit message failed since ${error.message}. Retrying...`,
      );
    }
  }

  if (argv.commit) {
    const noVerify = argv.noVerify ? '--no-verify' : '';
    logger.logAction({ message: 'Commit the changes.' });
    execSync(`git commit -m "${message}" ${noVerify}`);
    if (argv.push) {
      const hasRemote = execSync('git remote').toString().trim().length > 0;
      if (hasRemote) {
        try {
          logger.logAction({
            message: 'Push the changes to the remote repository.',
          });
          execSync('git push');
        } catch (error) {
          console.error('Failed to push changes:', error);
        }
      }
    }
  }
  if (argv.copy) {
    clipboardy.writeSync(message);
    logger.logResult('Commit message copied to clipboard');
  }
}

function checkCommitMessage(message: string) {
  if (message.length > 72) {
    throw new Error(`Commit message is too long: ${message}`);
  }
  if (message.length === 0) {
    throw new Error('Commit message is empty');
  }
}

function removeThoughts(message: string) {
  // e.g. gemini-2.5-pro-exp-03-25 contains <thought>...</thought>
  return message.replace(/<thought>[\s\S]*?<\/thought>/gm, '');
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
`;

/**
 * Get the staged diff while handling large files
 * - Excludes common lockfiles and large file types
 * - Limits diff size to prevent context overflow
 */
async function getStagedDiff() {
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
  const changed = execSync(`git diff --cached -- ${excludePatterns}`);
  const diff = changed.toString();

  // Limit diff size - 100KB is a reasonable limit for most LLM contexts
  const MAX_DIFF_SIZE = 100 * 1024; // 100KB

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
