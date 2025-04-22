import { execSync } from 'child_process';
import clipboardy from 'clipboardy';
import { askQuery } from '../llm/query';
import { Context } from '../types';

export async function runCommit(opts: { context: Context }) {
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
  const message = await askQuery({
    systemPrompt: [COMMIT_PROMPT],
    prompt: `
# Diffs:
${diff}
    `,
    context: opts.context,
  });
  if (argv.commit) {
    execSync(`git commit -m "${message}"`);
    if (argv.push) {
      execSync('git push');
    }
  }
  if (argv.copy) {
    clipboardy.writeSync(message);
    console.log('Copied to clipboard');
  }
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
 * TODO:
 * - [ ] Handle toooo large diff, e.g. pnpm-lock.yaml
 */
async function getStagedDiff() {
  const changed = execSync('git diff --cached');
  return changed.toString();
}
