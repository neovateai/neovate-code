import { exec } from 'child_process';
import fs from 'fs';
import path from 'pathe';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type Worktree = {
  name: string;
  path: string;
  branch: string;
  originalBranch: string;
  isClean: boolean;
};

export type WorktreeCreateOptions = {
  baseBranch: string;
  workspacesDir: string;
};

const CITY_NAMES = [
  'tokyo',
  'paris',
  'london',
  'seattle',
  'berlin',
  'sydney',
  'toronto',
  'boston',
  'madrid',
  'rome',
  'vienna',
  'oslo',
  'dublin',
  'prague',
  'amsterdam',
  'barcelona',
  'munich',
  'zurich',
  'stockholm',
  'helsinki',
  'copenhagen',
  'brussels',
  'lisbon',
  'milan',
  'athens',
  'budapest',
  'warsaw',
  'bangkok',
  'singapore',
  'hong-kong',
  'shanghai',
  'beijing',
  'seoul',
  'taipei',
  'melbourne',
  'auckland',
  'vancouver',
  'montreal',
  'chicago',
  'austin',
  'denver',
  'portland',
  'miami',
  'atlanta',
  'phoenix',
  'dallas',
  'houston',
  'philadelphia',
  'san-diego',
  'las-vegas',
  'nashville',
  'columbus',
  'charlotte',
  'detroit',
  'minneapolis',
  'tampa',
  'orlando',
  'kansas-city',
  'cleveland',
  'pittsburgh',
  'cincinnati',
  'milwaukee',
  'salt-lake',
  'raleigh',
  'memphis',
  'richmond',
  'baltimore',
  'louisville',
  'jacksonville',
  'tucson',
  'fresno',
  'sacramento',
  'mesa',
  'albuquerque',
  'tucson',
  'omaha',
  'tulsa',
  'wichita',
  'arlington',
  'bakersfield',
  'aurora',
  'anaheim',
  'honolulu',
  'riverside',
  'corpus-christi',
  'lexington',
  'henderson',
  'stockton',
  'saint-paul',
  'newark',
  'plano',
  'buffalo',
  'lincoln',
  'chandler',
  'greensboro',
  'scottsdale',
  'baton-rouge',
  'madison',
];

/**
 * Execute git command in the specified directory
 */
async function execGit(
  cwd: string,
  command: string,
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(`git ${command}`, { cwd });
}

/**
 * Check if the current directory is a git repository
 */
export async function isGitRepository(cwd: string): Promise<boolean> {
  try {
    await execGit(cwd, 'rev-parse --git-dir');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the root directory of the git repository
 */
export async function getGitRoot(cwd: string): Promise<string> {
  const { stdout } = await execGit(cwd, 'rev-parse --show-toplevel');
  return stdout.trim();
}

/**
 * Check if working directory is clean (no uncommitted changes)
 */
export async function ensureCleanWorkingDirectory(cwd: string): Promise<void> {
  const { stdout } = await execGit(cwd, 'status --porcelain');
  if (stdout.trim()) {
    const files = stdout
      .trim()
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n');
    throw new Error(
      `You have uncommitted changes. Please commit or stash them first.\n\n${files}`,
    );
  }
}

/**
 * Verify that a branch exists
 */
export async function verifyBranchExists(
  cwd: string,
  branch: string,
): Promise<void> {
  try {
    await execGit(cwd, `rev-parse --verify ${branch}`);
  } catch {
    throw new Error(`Branch '${branch}' does not exist.`);
  }
}

/**
 * Detect main branch (main or master)
 */
export async function detectMainBranch(cwd: string): Promise<string> {
  try {
    // Try to get the default branch from remote
    const { stdout } = await execGit(
      cwd,
      'symbolic-ref refs/remotes/origin/HEAD',
    );
    const branch = stdout.trim().replace('refs/remotes/origin/', '');
    if (branch) return branch;
  } catch {
    // Fallback to checking if main or master exists
    try {
      await execGit(cwd, 'rev-parse --verify main');
      return 'main';
    } catch {
      try {
        await execGit(cwd, 'rev-parse --verify master');
        return 'master';
      } catch {
        throw new Error(
          'Could not detect main branch. Please ensure main or master branch exists.',
        );
      }
    }
  }
  return 'main';
}

/**
 * Update main branch from remote
 */
export async function updateMainBranch(
  cwd: string,
  mainBranch: string,
  skipUpdate = false,
): Promise<void> {
  if (skipUpdate) return;

  try {
    // Fetch from origin
    await execGit(cwd, `fetch origin ${mainBranch}`);

    // Get current branch to restore later
    const { stdout: currentBranch } = await execGit(
      cwd,
      'rev-parse --abbrev-ref HEAD',
    );

    // Checkout main and update
    await execGit(cwd, `checkout ${mainBranch}`);
    await execGit(cwd, `merge origin/${mainBranch} --ff-only`);

    // Return to original branch if different
    if (currentBranch.trim() !== mainBranch) {
      await execGit(cwd, `checkout ${currentBranch.trim()}`);
    }
  } catch (error: any) {
    if (error.message?.includes('Could not resolve host')) {
      throw new Error(
        'Network error: Could not fetch from remote. Use --skip-update to skip updating main branch.',
      );
    }
    if (error.message?.includes('no remote')) {
      throw new Error(
        'No remote configured. Please set up a remote or use --skip-update flag.',
      );
    }
    throw new Error(`Failed to update main branch: ${error.message}`);
  }
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(cwd: string): Promise<string> {
  const { stdout } = await execGit(cwd, 'rev-parse --abbrev-ref HEAD');
  return stdout.trim();
}

/**
 * Generate random city name that doesn't already exist
 */
export async function generateWorkspaceName(cwd: string): Promise<string> {
  const existing = await listWorktrees(cwd);
  const existingNames = new Set(existing.map((w) => w.name));

  const available = CITY_NAMES.filter((name) => !existingNames.has(name));
  if (available.length === 0) {
    // Fallback to timestamp-based name
    return `workspace-${Date.now()}`;
  }

  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

/**
 * Create a new worktree
 */
export async function createWorktree(
  cwd: string,
  name: string,
  opts: WorktreeCreateOptions,
): Promise<Worktree> {
  const gitRoot = await getGitRoot(cwd);
  const worktreePath = path.join(gitRoot, opts.workspacesDir, name);
  const branchName = `workspace/${name}`;

  // Check if worktree already exists
  const existing = await listWorktrees(gitRoot);
  if (existing.some((w) => w.name === name)) {
    throw new Error(
      `Workspace '${name}' already exists. Use a different name or delete it first.`,
    );
  }

  try {
    // Create worktree with new branch
    await execGit(
      gitRoot,
      `worktree add -b ${branchName} "${worktreePath}" ${opts.baseBranch}`,
    );

    return {
      name,
      path: worktreePath,
      branch: branchName,
      originalBranch: await getCurrentBranch(gitRoot),
      isClean: true,
    };
  } catch (error: any) {
    throw new Error(`Failed to create worktree: ${error.message}`);
  }
}

/**
 * List all worktrees in .neovate-workspaces
 */
export async function listWorktrees(cwd: string): Promise<Worktree[]> {
  try {
    const gitRoot = await getGitRoot(cwd);
    const { stdout } = await execGit(gitRoot, 'worktree list --porcelain');

    const worktrees: Worktree[] = [];
    const lines = stdout.split('\n');

    let currentWorktree: Partial<Worktree> = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        const worktreePath = line.substring('worktree '.length);

        // Only include worktrees in .neovate-workspaces
        if (worktreePath.includes('.neovate-workspaces')) {
          currentWorktree.path = worktreePath;
          const name = path.basename(worktreePath);
          currentWorktree.name = name;
        } else {
          currentWorktree = {};
        }
      } else if (line.startsWith('branch ') && currentWorktree.path) {
        const branch = line.substring('branch '.length);
        currentWorktree.branch = branch.replace('refs/heads/', '');

        // Extract original branch from workspace branch pattern
        if (currentWorktree.branch?.startsWith('workspace/')) {
          // We'll store the branch name, but originalBranch needs to be tracked separately
          // For now, we'll set it to empty and handle it in metadata later
          currentWorktree.originalBranch = '';
        }
      } else if (line === '' && currentWorktree.path) {
        // End of worktree entry
        try {
          const { stdout: status } = await execGit(
            currentWorktree.path,
            'status --porcelain',
          );
          currentWorktree.isClean = !status.trim();
        } catch {
          currentWorktree.isClean = false;
        }

        if (currentWorktree.name && currentWorktree.branch) {
          worktrees.push(currentWorktree as Worktree);
        }
        currentWorktree = {};
      }
    }

    return worktrees;
  } catch (error: any) {
    throw new Error(`Failed to list worktrees: ${error.message}`);
  }
}

/**
 * Delete a worktree
 */
export async function deleteWorktree(
  cwd: string,
  name: string,
  force = false,
): Promise<void> {
  const gitRoot = await getGitRoot(cwd);
  const worktrees = await listWorktrees(gitRoot);
  const worktree = worktrees.find((w) => w.name === name);

  if (!worktree) {
    throw new Error(
      `Workspace '${name}' not found. Use 'neo workspace list' to see active workspaces.`,
    );
  }

  if (!worktree.isClean && !force) {
    throw new Error(
      `Workspace '${name}' has uncommitted changes. Use --force to delete anyway.`,
    );
  }

  try {
    // Remove worktree
    const forceFlag = force ? '--force' : '';
    await execGit(gitRoot, `worktree remove ${forceFlag} "${worktree.path}"`);

    // Delete branch
    try {
      await execGit(gitRoot, `branch -D ${worktree.branch}`);
    } catch {
      // Branch might not exist or already deleted, ignore
    }
  } catch (error: any) {
    throw new Error(`Failed to delete worktree: ${error.message}`);
  }
}

/**
 * Find where a branch is checked out (if in any worktree)
 */
async function findBranchWorktree(
  gitRoot: string,
  branch: string,
): Promise<string | null> {
  try {
    const { stdout } = await execGit(gitRoot, 'worktree list --porcelain');
    const lines = stdout.split('\n');

    let currentPath: string | null = null;
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        currentPath = line.substring('worktree '.length);
      } else if (
        line.startsWith('branch ') &&
        currentPath &&
        line.includes(branch)
      ) {
        return currentPath;
      } else if (line === '') {
        currentPath = null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Merge worktree back to original branch
 */
export async function mergeWorktree(
  cwd: string,
  worktree: Worktree,
): Promise<void> {
  const gitRoot = await getGitRoot(cwd);

  try {
    // Verify original branch exists, if not, detect main branch
    let targetBranch = worktree.originalBranch;
    try {
      await execGit(gitRoot, `rev-parse --verify ${targetBranch}`);
    } catch {
      // Original branch doesn't exist, detect main branch
      targetBranch = await detectMainBranch(gitRoot);
      console.log(
        `Original branch '${worktree.originalBranch}' not found, using '${targetBranch}' instead.`,
      );
    }

    // Check if target branch is checked out in another worktree
    const targetWorktreePath = await findBranchWorktree(gitRoot, targetBranch);

    if (targetWorktreePath) {
      // Verify the worktree path exists and is accessible
      if (!fs.existsSync(targetWorktreePath)) {
        throw new Error(
          `Target branch '${targetBranch}' is checked out at '${targetWorktreePath}', but that directory doesn't exist. Please run 'git worktree prune' to clean up stale worktrees.`,
        );
      }

      // Target branch is checked out in another worktree, merge there
      console.log(
        `Target branch is checked out at '${targetWorktreePath}', merging there...`,
      );
      await execGit(targetWorktreePath, `merge ${worktree.branch} --no-ff`);
    } else {
      // Target branch is not checked out, safe to checkout and merge in main repo
      await execGit(gitRoot, `checkout ${targetBranch}`);
      await execGit(gitRoot, `merge ${worktree.branch} --no-ff`);
    }

    // Delete worktree
    await execGit(gitRoot, `worktree remove "${worktree.path}"`);

    // Delete branch
    await execGit(gitRoot, `branch -d ${worktree.branch}`);
  } catch (error: any) {
    if (error.message?.includes('CONFLICT')) {
      throw new Error(
        `Merge conflict occurred. Please resolve conflicts manually:\n1. cd ${gitRoot}\n2. Resolve conflicts\n3. git commit\n4. Run 'neo workspace delete ${worktree.name}' to clean up`,
      );
    }
    throw new Error(`Failed to merge worktree: ${error.message}`);
  }
}

/**
 * Add .neovate-workspaces to .git/info/exclude
 */
export async function addToGitExclude(cwd: string): Promise<void> {
  try {
    const gitRoot = await getGitRoot(cwd);
    const excludePath = path.join(gitRoot, '.git', 'info', 'exclude');

    let content = '';
    if (fs.existsSync(excludePath)) {
      content = fs.readFileSync(excludePath, 'utf-8');
    }

    if (!content.includes('/.neovate-workspaces')) {
      content += '\n/.neovate-workspaces\n';
      fs.writeFileSync(excludePath, content);
    }
  } catch (error: any) {
    // Not critical, just warn
    console.warn(
      `Warning: Could not update .git/info/exclude: ${error.message}`,
    );
  }
}

/**
 * Get worktree from current directory
 */
export async function getWorktreeFromPath(cwd: string): Promise<Worktree> {
  const gitRoot = await getGitRoot(cwd);
  const worktrees = await listWorktrees(gitRoot);

  // Check if current path is inside a worktree
  for (const worktree of worktrees) {
    if (cwd.startsWith(worktree.path)) {
      return worktree;
    }
  }

  throw new Error(
    'Not in a workspace directory. Run this from inside a workspace or specify name.',
  );
}

/**
 * Check if a branch exists on remote
 */
export async function isRemoteBranchExists(
  cwd: string,
  branch: string,
): Promise<boolean> {
  try {
    await execGit(cwd, `ls-remote --heads origin ${branch}`);
    return true;
  } catch {
    return false;
  }
}
