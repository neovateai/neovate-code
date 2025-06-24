import { execFileNoThrow } from './execFileNoThrow';

export async function getGitStatus(opts: { cwd: string }) {
  const cwd = opts.cwd;
  const isGit = await (async () => {
    const { code } = await execFileNoThrow(
      cwd,
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
      cwd,
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
      cwd,
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
      cwd,
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
      cwd,
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
      cwd,
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
      cwd,
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
