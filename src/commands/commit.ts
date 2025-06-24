import { ModelProvider, Runner } from '@openai/agents';
import * as p from '@umijs/clack-prompts';
import { ExecSyncOptionsWithStringEncoding, execSync } from 'child_process';
import clipboardy from 'clipboardy';
import pc from 'picocolors';
import yargsParser from 'yargs-parser';
import { RunCliOpts } from '..';
import { createCommitAgent } from '../agents/commit';
import { ConfigManager } from '../config';
import { getDefaultModelProvider } from '../provider';
import * as logger from '../utils/logger';

interface GenerateCommitMessageOpts {
  prompt: string;
  model: string;
  language?: string;
  modelProvider?: ModelProvider;
}

async function generateCommitMessage(opts: GenerateCommitMessageOpts) {
  const agent = createCommitAgent({
    model: opts.model,
    language: opts.language ?? 'english',
  });
  const runner = new Runner({
    modelProvider: opts.modelProvider ?? getDefaultModelProvider(),
  });
  const result = await runner.run(agent, opts.prompt);
  const message = result.finalOutput;
  if (typeof message !== 'string') {
    throw new Error('Commit message is not a string');
  }
  return message;
}

function printHelp(p: string) {
  console.log(
    `
Usage:
  ${p} commit [options]

Generate intelligent commit messages based on staged changes.

Options:
  -h, --help                    Show help
  -s, --stage                   Stage all changes before committing
  -c, --commit                  Commit changes automatically
  -n, --no-verify               Skip pre-commit hooks
  -i, --interactive             Interactive mode (default)
  -m, --model <model>           Specify model to use
  --language <language>         Set language for commit message
  --copy                        Copy commit message to clipboard
  --push                        Push changes after commit
  --follow-style                Follow existing repository commit style

Examples:
  ${p} commit                 Interactive mode - generate and choose action
  ${p} commit -s -c           Stage all changes and commit automatically
  ${p} commit --copy          Generate message and copy to clipboard
  ${p} commit -s -c --push    Stage, commit and push in one command
  ${p} commit --follow-style  Generate message following repo style
      `.trim(),
  );
}

export async function runCommit(opts: RunCliOpts) {
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      stage: 's',
      commit: 'c',
      noVerify: 'n',
      interactive: 'i',
      model: 'm',
      help: 'h',
    },
    boolean: [
      'stage',
      'push',
      'commit',
      'noVerify',
      'copy',
      'interactive',
      'followStyle',
      'help',
    ],
    string: ['model', 'language'],
  });

  // help
  if (argv.help) {
    printHelp(opts.productName.toLowerCase());
    return;
  }

  logger.logIntro({
    productName: opts.productName,
    version: opts.version,
  });
  if (!argv.interactive && !argv.commit && !argv.copy) {
    argv.interactive = true;
  }
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

  const configManager = new ConfigManager(process.cwd(), opts.productName, {
    model: argv.model,
    language: argv.language,
  });

  // Generate the commit message
  let message = '';
  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    try {
      const stop = logger.spinThink({ productName: opts.productName });
      message = await generateCommitMessage({
        prompt: `
# Diffs:
${diff}
${repoStyle}
        `,
        model: configManager.config.model,
        language: configManager.config.language,
        modelProvider: opts.modelProvider,
      });
      stop();
      checkCommitMessage(message);
      break;
    } catch (error: any) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw error;
      }
    }
  }

  // Check if interactive mode is needed
  const isNonInteractiveParam =
    argv.stage || argv.commit || argv.noVerify || argv.copy;
  if (argv.interactive && !isNonInteractiveParam) {
    await handleInteractiveMode(message);
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

function copyToClipboard(message: string) {
  clipboardy.writeSync(message);
  logger.logResult('Commit message copied to clipboard');
}

async function commitChanges(message: string, skipHooks = false) {
  const noVerify = skipHooks ? '--no-verify' : '';
  logger.logAction({ message: 'Commit the changes.' });
  execSync(`git commit -m "${message}" ${noVerify}`);
  logger.logResult('Commit message committed');
}

async function pushChanges() {
  const hasRemote = execSync('git remote').toString().trim().length > 0;
  if (hasRemote) {
    try {
      logger.logAction({
        message: 'Push changes to remote repository.',
      });
      execSync('git push');
      logger.logResult('Changes pushed to remote repository');
    } catch (error) {
      console.error('Push changes failed:', error);
    }
  } else {
    logger.logWarn('No remote repository configured, cannot push');
  }
}

// Handle interactive mode
async function handleInteractiveMode(message: string) {
  logger.logResult(`Generated commit message: ${pc.cyan(message)}`);

  // Ask user what to do next
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

  // Execute actions based on user selection
  switch (action) {
    case 'copy':
      copyToClipboard(message);
      break;
    case 'commit':
      await commitChanges(message);
      break;
    case 'push':
      // Ask if pre-commit hooks should be skipped
      const skipHooksResult = await p.confirm({
        message: pc.bold(pc.blueBright('Should pre-commit hooks be skipped?')),
        active: 'Yes',
        inactive: 'No',
        initialValue: false,
      });

      // Check if the result was cancelled
      if (p.isCancel(skipHooksResult)) {
        logger.logAction({ message: 'Operation cancelled' });
        return;
      }

      // Execute the commit
      await commitChanges(message, skipHooksResult);
      await pushChanges();
      break;
    case 'edit':
      // Ask user to edit the commit message
      const editedMessage = await p.text({
        message: pc.bold(pc.blueBright('Edit the commit message:')),
        initialValue: message,
      });

      if (p.isCancel(editedMessage)) {
        logger.logAction({ message: 'Operation cancelled' });
        return;
      }

      // Use the edited message again to show the operation options
      await handleInteractiveMode(editedMessage);
      break;
    case 'cancel':
      logger.logAction({ message: 'Operation cancelled' });
      break;
  }
}

function checkCommitMessage(message: string) {
  // make length check a litter more lenient
  // since sometimes it needs a little more informations
  // e.g.
  // - `build: add dev dependencies for basement, axios, git-repo-info, urllib, and zx`
  if (message.length > 90) {
    throw new Error(`Commit message is too long: ${message}`);
  }
  if (message.length === 0) {
    throw new Error('Commit message is empty');
  }
}

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
  const execOptions: ExecSyncOptionsWithStringEncoding = {
    maxBuffer: 100 * 1024 * 1024, // 100MB buffer
    encoding: 'utf-8',
  };

  const diff = execSync(`git diff --cached -- ${excludePatterns}`, execOptions);

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
