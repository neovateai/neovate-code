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
  return {
    branch,
    mainBranch,
    status,
    log,
    author,
    authorLog,
  };
}

export async function getLlmGitStatus(
  status: Awaited<ReturnType<typeof getGitStatus>>,
) {
  if (!status) {
    return null;
  }
  return `
This is the git status at the start of the conversation. Note that this status is a snapshot in time, and will not update during the conversation.
Current branch: ${status.branch}

Main branch (you will usually use this for PRs): ${status.mainBranch}

Status:
${status.status || '(clean)'}

Recent commits:
${status.log}

Your recent commits:
${status.authorLog || '(no recent commits)'}
  `.trim();
}

/**
 * Get remote origin URL
 */
export async function getGitRemoteUrl(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['config', '--get', 'remote.origin.url'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Get default branch from remote
 */
export async function getDefaultBranch(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['rev-parse', '--abbrev-ref', 'origin/HEAD'],
      undefined,
      undefined,
      false,
    );
    return stdout.replace('origin/', '').trim() || null;
  } catch {
    return null;
  }
}

/**
 * Check sync status with remote
 */
export async function getGitSyncStatus(
  cwd: string,
): Promise<'synced' | 'ahead' | 'behind' | 'diverged' | 'unknown'> {
  try {
    // Fetch remote to get latest info
    await execFileNoThrow(
      cwd,
      'git',
      ['fetch', 'origin', '--quiet'],
      undefined,
      undefined,
      false,
    );

    // Get current branch
    const { stdout: branch } = await execFileNoThrow(
      cwd,
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      undefined,
      undefined,
      false,
    );
    const currentBranch = branch.trim();

    // Check if remote tracking branch exists
    const { code: trackingExists } = await execFileNoThrow(
      cwd,
      'git',
      ['rev-parse', '--verify', `origin/${currentBranch}`],
      undefined,
      undefined,
      false,
    );

    if (trackingExists !== 0) {
      return 'unknown';
    }

    // Get ahead/behind counts
    const { stdout: counts } = await execFileNoThrow(
      cwd,
      'git',
      ['rev-list', '--left-right', '--count', `origin/${currentBranch}...HEAD`],
      undefined,
      undefined,
      false,
    );

    const [behind, ahead] = counts.trim().split('\t').map(Number);

    if (ahead === 0 && behind === 0) {
      return 'synced';
    }
    if (ahead > 0 && behind === 0) {
      return 'ahead';
    }
    if (ahead === 0 && behind > 0) {
      return 'behind';
    }
    return 'diverged';
  } catch {
    return 'unknown';
  }
}

/**
 * Get current commit hash
 */
export async function getCurrentCommit(cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['rev-parse', 'HEAD'],
      undefined,
      undefined,
      false,
    );
    return stdout.trim();
  } catch {
    return '';
  }
}

/**
 * Get list of pending changes
 */
export async function getPendingChanges(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['status', '--porcelain'],
      undefined,
      undefined,
      false,
    );
    if (!stdout.trim()) {
      return [];
    }
    return stdout
      .trim()
      .split('\n')
      .map((line) => line.substring(3).trim());
  } catch {
    return [];
  }
}
