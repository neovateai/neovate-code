import { execFileNoThrow } from './execFileNoThrow';

// ============================================================================
// Internal Helpers (DRY)
// ============================================================================

async function gitExec(
  cwd: string,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  return execFileNoThrow(cwd, 'git', args, undefined, undefined, false);
}

async function gitCheck(cwd: string, args: string[]): Promise<boolean> {
  const { code } = await gitExec(cwd, args);
  return code === 0;
}

async function gitOutput(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await gitExec(cwd, args);
  return stdout.trim();
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if git is installed and available in PATH
 */
export async function isGitInstalled(): Promise<boolean> {
  try {
    const { code } = await execFileNoThrow(
      process.cwd(),
      'git',
      ['--version'],
      undefined,
      undefined,
      false,
    );
    return code === 0;
  } catch {
    return false;
  }
}

/**
 * Check if the given directory is inside a git repository
 */
export async function isGitRepository(cwd: string): Promise<boolean> {
  return gitCheck(cwd, ['rev-parse', '--is-inside-work-tree']);
}

/**
 * Check if git user name and email are configured
 */
export async function isGitUserConfigured(
  cwd: string,
): Promise<{ name: boolean; email: boolean }> {
  const [nameResult, emailResult] = await Promise.all([
    gitCheck(cwd, ['config', 'user.name']),
    gitCheck(cwd, ['config', 'user.email']),
  ]);
  return { name: nameResult, email: emailResult };
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Check if there are uncommitted changes (staged or unstaged)
 */
export async function hasUncommittedChanges(cwd: string): Promise<boolean> {
  const output = await gitOutput(cwd, ['status', '--porcelain']);
  return output.length > 0;
}

/**
 * Check if any remote is configured
 */
export async function hasRemote(cwd: string): Promise<boolean> {
  const output = await gitOutput(cwd, ['remote']);
  return output.length > 0;
}

/**
 * Check if a branch exists
 */
export async function branchExists(
  cwd: string,
  branchName: string,
): Promise<boolean> {
  return gitCheck(cwd, ['rev-parse', '--verify', branchName]);
}

/**
 * Get recent commit messages
 */
export async function getRecentCommitMessages(
  cwd: string,
  count = 10,
): Promise<string> {
  return gitOutput(cwd, ['log', '-n', String(count), '--pretty=format:%s']);
}

// ============================================================================
// Action Functions
// ============================================================================

/**
 * Stage all changes
 */
export async function stageAll(cwd: string): Promise<void> {
  const { code, stderr } = await gitExec(cwd, ['add', '.']);
  if (code !== 0) {
    const errorMessage = stderr || 'Unknown error';
    if (errorMessage.includes('fatal: pathspec')) {
      throw new Error('Failed to stage files: Invalid file path or pattern');
    }
    throw new Error(`Failed to stage files: ${errorMessage}`);
  }
}

/**
 * Commit staged changes with a message
 * @param cwd - Working directory
 * @param message - Commit message
 * @param skipHooks - Skip pre-commit hooks
 * @param onOutput - Optional callback for streaming output
 */
export async function gitCommit(
  cwd: string,
  message: string,
  skipHooks = false,
  onOutput?: (line: string, stream: 'stdout' | 'stderr') => void,
): Promise<void> {
  const args = ['commit', '-m', message];
  if (skipHooks) {
    args.push('--no-verify');
  }

  // If no output callback, use the simple exec approach
  if (!onOutput) {
    const { code, stderr } = await gitExec(cwd, args);
    if (code !== 0) {
      throw new Error(stderr || 'Commit failed');
    }
    return;
  }

  // Use spawn for streaming output
  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const gitProcess = spawn('git', args, { cwd });
    let stderr = '';

    const processOutput = (
      data: Buffer,
      stream: 'stdout' | 'stderr',
      buffer: string,
    ): string => {
      const text = buffer + data.toString();
      const lines = text.split('\n');
      // Keep the last incomplete line in buffer
      const incomplete = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) {
          onOutput(line, stream);
        }
      }
      return incomplete;
    };

    let stdoutBuffer = '';
    let stderrBuffer = '';

    gitProcess.stdout?.on('data', (data: Buffer) => {
      stdoutBuffer = processOutput(data, 'stdout', stdoutBuffer);
    });

    gitProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
      stderrBuffer = processOutput(data, 'stderr', stderrBuffer);
    });

    gitProcess.on('error', (error) => {
      reject(error);
    });

    gitProcess.on('close', (code) => {
      // Flush any remaining buffered content
      if (stdoutBuffer.trim()) {
        onOutput(stdoutBuffer, 'stdout');
      }
      if (stderrBuffer.trim()) {
        onOutput(stderrBuffer, 'stderr');
      }

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || 'Commit failed'));
      }
    });
  });
}

/**
 * Push changes to remote
 * @param cwd - Working directory
 * @param onOutput - Optional callback for streaming output
 */
export async function gitPush(
  cwd: string,
  onOutput?: (line: string, stream: 'stdout' | 'stderr') => void,
): Promise<void> {
  // If no output callback, use the simple exec approach
  if (!onOutput) {
    const { code, stderr } = await gitExec(cwd, ['push']);
    if (code !== 0) {
      throw new Error(stderr || 'Push failed');
    }
    return;
  }

  // Use spawn for streaming output with progress
  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    // Use --progress to ensure git outputs progress info
    const gitProcess = spawn('git', ['push', '--progress'], { cwd });
    let stderr = '';

    // Process output, handling \r (carriage return) for in-place progress updates
    // Only output complete lines (ending with \n), taking the last \r segment
    const processOutput = (
      data: Buffer,
      stream: 'stdout' | 'stderr',
      buffer: string,
    ): string => {
      const text = buffer + data.toString();
      // Split by newlines only
      const lines = text.split('\n');
      // Keep the last incomplete line in buffer
      const incomplete = lines.pop() || '';
      for (const line of lines) {
        // For lines with \r, take only the last segment (final progress state)
        const segments = line.split('\r');
        const finalSegment = segments[segments.length - 1];
        if (finalSegment.trim()) {
          onOutput(finalSegment, stream);
        }
      }
      return incomplete;
    };

    let stdoutBuffer = '';
    let stderrBuffer = '';

    gitProcess.stdout?.on('data', (data: Buffer) => {
      stdoutBuffer = processOutput(data, 'stdout', stdoutBuffer);
    });

    gitProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
      stderrBuffer = processOutput(data, 'stderr', stderrBuffer);
    });

    gitProcess.on('error', (error) => {
      reject(error);
    });

    gitProcess.on('close', (code) => {
      // Flush any remaining buffered content, handling \r for progress updates
      if (stdoutBuffer.trim()) {
        const segments = stdoutBuffer.split('\r');
        const finalSegment = segments[segments.length - 1];
        if (finalSegment.trim()) {
          onOutput(finalSegment, 'stdout');
        }
      }
      if (stderrBuffer.trim()) {
        const segments = stderrBuffer.split('\r');
        const finalSegment = segments[segments.length - 1];
        if (finalSegment.trim()) {
          onOutput(finalSegment, 'stderr');
        }
      }

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || 'Push failed'));
      }
    });
  });
}

/**
 * Create and checkout a new branch
 */
export async function createAndCheckoutBranch(
  cwd: string,
  branchName: string,
): Promise<void> {
  const { code, stderr } = await gitExec(cwd, ['checkout', '-b', branchName]);
  if (code !== 0) {
    throw new Error(stderr || 'Failed to create branch');
  }
}

// ============================================================================
// Composite Functions
// ============================================================================

export async function getGitStatus(opts: { cwd: string }) {
  const { cwd } = opts;
  if (!(await isGitRepository(cwd))) {
    return null;
  }

  const [branch, mainBranch, status, log, author] = await Promise.all([
    gitOutput(cwd, ['branch', '--show-current']),
    gitOutput(cwd, ['rev-parse', '--abbrev-ref', 'origin/HEAD']).then((s) =>
      s.replace('origin/', ''),
    ),
    gitOutput(cwd, ['status', '--short']),
    gitOutput(cwd, ['log', '--oneline', '-n', '5']),
    gitOutput(cwd, ['config', 'user.email']),
  ]);

  const authorLog = await gitOutput(cwd, [
    'log',
    '--author',
    author,
    '--oneline',
    '-n',
    '5',
  ]);

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

/**
 * Get staged file list with status
 */
export async function getStagedFileList(cwd: string): Promise<string> {
  return gitOutput(cwd, ['diff', '--cached', '--name-status']);
}

/**
 * Git URL validation patterns
 */
const GIT_HTTPS_PATTERN =
  /^https?:\/\/(?:[a-zA-Z0-9_.~-]+@)?[a-zA-Z0-9_.~-]+(?:\.[a-zA-Z0-9_.~-]+)*(?::\d+)?\/[a-zA-Z0-9_.~/-]+(\.git)?$/;
const GIT_SSH_PATTERN =
  /^git@[a-zA-Z0-9_.~-]+(?:\.[a-zA-Z0-9_.~-]+)*:[a-zA-Z0-9_.~/-]+(\.git)?$/;

/**
 * Validate git repository URL format
 */
export function validateGitUrl(url: string): boolean {
  return GIT_HTTPS_PATTERN.test(url) || GIT_SSH_PATTERN.test(url);
}

/**
 * Sanitize git URL to prevent command injection
 */
export function sanitizeGitUrl(url: string): string {
  return url
    .split(/[;&|`$()]/)[0] // Remove shell special characters
    .trim();
}

/**
 * Validate destination path security
 */
export function validateDestinationPath(destination: string): {
  valid: boolean;
  error?: string;
} {
  const { resolve } = require('pathe');
  const normalizedDest = resolve(destination);
  const dangerousPaths = [
    '/etc',
    '/usr',
    '/bin',
    '/sbin',
    '/var',
    '/System',
    'C:\\Windows',
    'C:\\Program Files',
  ];

  if (dangerousPaths.some((p) => normalizedDest.startsWith(p))) {
    return {
      valid: false,
      error: 'Cannot clone to system directories',
    };
  }

  return { valid: true };
}

/**
 * Extract repository name from git URL
 */
export function extractRepoName(url: string): string {
  const repoNameMatch = url.match(/\/([^/]+?)(\.git)?$/);
  return repoNameMatch ? repoNameMatch[1] : `repo-${Date.now()}`;
}

/**
 * Parse git clone progress output
 */
export interface GitCloneProgress {
  percent: number;
  message: string;
}

export class GitCloneProgressParser {
  private currentStage = '';
  private stageProgress = { receiving: 0, resolving: 0, checking: 0 };
  private lastOverallPercent = 0;

  parse(output: string): GitCloneProgress | null {
    // Support both English and Chinese Git output
    const progressMatch = output.match(/(\d+)%/);
    if (!progressMatch) {
      return null;
    }

    const percent = Number.parseInt(progressMatch[1], 10);

    // Detect current stage and update stage progress
    if (output.includes('Receiving objects') || output.includes('接收对象中')) {
      this.currentStage = 'receiving';
      this.stageProgress.receiving = percent;
    } else if (
      output.includes('Resolving deltas') ||
      output.includes('处理 delta 中')
    ) {
      // Mark receiving as complete when resolving starts
      if (this.stageProgress.receiving === 0) {
        this.stageProgress.receiving = 100;
      }

      // Reset lastOverallPercent when transitioning to new stage
      if (this.currentStage !== 'resolving') {
        this.lastOverallPercent = 0;
      }

      this.currentStage = 'resolving';
      this.stageProgress.resolving = percent;
    } else if (
      output.includes('Checking out files') ||
      output.includes('检出文件中')
    ) {
      // Mark previous stages as complete
      if (this.stageProgress.receiving === 0) {
        this.stageProgress.receiving = 100;
      }
      if (this.stageProgress.resolving === 0) {
        this.stageProgress.resolving = 100;
      }

      // Reset lastOverallPercent when transitioning to new stage
      if (this.currentStage !== 'checking') {
        this.lastOverallPercent = 0;
      }

      this.currentStage = 'checking';
      this.stageProgress.checking = percent;
    } else {
      // Unknown stage with percentage - skip to avoid noise
      return null;
    }

    // Calculate overall progress (0-100%)
    let overallPercent = 0;

    // Determine active stages
    const hasResolving =
      this.stageProgress.resolving > 0 || this.currentStage === 'resolving';
    const hasChecking =
      this.stageProgress.checking > 0 || this.currentStage === 'checking';

    if (hasResolving && hasChecking) {
      // All three stages: Receiving(0-70%), Resolving(70-90%), Checking(90-100%)
      overallPercent =
        Math.floor((this.stageProgress.receiving * 70) / 100) +
        Math.floor((this.stageProgress.resolving * 20) / 100) +
        Math.floor((this.stageProgress.checking * 10) / 100);
    } else if (hasResolving) {
      // Two stages: Receiving(0-80%), Resolving(80-100%)
      overallPercent =
        Math.floor((this.stageProgress.receiving * 80) / 100) +
        Math.floor((this.stageProgress.resolving * 20) / 100);
    } else {
      // Single stage (small repos): Receiving(0-100%)
      overallPercent = this.stageProgress.receiving;
    }

    // Ensure progress only increases (monotonic progress)
    overallPercent = Math.max(overallPercent, this.lastOverallPercent);
    this.lastOverallPercent = overallPercent;

    return {
      percent: overallPercent,
      message: output.trim(),
    };
  }
}

/**
 * Clone repository options
 */
export interface CloneRepositoryOptions {
  url: string;
  destination: string;
  onProgress?: (progress: GitCloneProgress) => void;
  signal?: AbortSignal;
  timeoutMinutes?: number;
}

/**
 * Clone repository result
 */
export interface CloneRepositoryResult {
  success: boolean;
  clonePath?: string;
  repoName?: string;
  error?: string;
  errorCode?:
    | 'CANCELLED'
    | 'SSH_AUTH_FAILED'
    | 'AUTH_REQUIRED'
    | 'NETWORK_ERROR'
    | 'REPO_NOT_FOUND'
    | 'TIMEOUT'
    | 'GIT_NOT_INSTALLED'
    | 'INVALID_URL'
    | 'DIR_EXISTS'
    | 'UNKNOWN';
  needsCredentials?: boolean;
}

/**
 * Clone a git repository
 */
export async function cloneRepository(
  options: CloneRepositoryOptions,
): Promise<CloneRepositoryResult> {
  const { promisify } = await import('util');
  const { spawn, execFile } = await import('child_process');
  const { existsSync, mkdirSync, rmSync } = await import('fs');
  const { join, resolve } = await import('pathe');

  let clonePath = '';

  try {
    // Validate inputs
    if (!options.url || !options.destination) {
      return {
        success: false,
        error: 'Git URL and destination are required',
      };
    }

    // Sanitize Git URL
    const sanitizedUrl = sanitizeGitUrl(options.url);

    // Check if Git is available
    try {
      const execFilePromise = promisify(execFile);
      await execFilePromise('git', ['--version']);
    } catch (_gitError) {
      return {
        success: false,
        error:
          'Git is not installed or not available in PATH. Please install Git and try again.',
        errorCode: 'GIT_NOT_INSTALLED',
      };
    }

    // Validate URL format
    if (!validateGitUrl(sanitizedUrl)) {
      return {
        success: false,
        error:
          'Invalid Git repository URL format. Please use HTTPS or SSH format.',
        errorCode: 'INVALID_URL',
      };
    }

    // Ensure destination directory exists
    if (!existsSync(options.destination)) {
      mkdirSync(options.destination, { recursive: true });
    }

    // Validate destination path security
    const destValidation = validateDestinationPath(options.destination);
    if (!destValidation.valid) {
      return {
        success: false,
        error: destValidation.error,
      };
    }

    // Extract repo name and build clone path
    const repoName = extractRepoName(sanitizedUrl);
    clonePath = join(options.destination, repoName);

    // Check if directory already exists
    if (existsSync(clonePath)) {
      return {
        success: false,
        error: `Directory '${repoName}' already exists at destination`,
        errorCode: 'DIR_EXISTS',
      };
    }

    // Clone the repository
    let gitProcess: ReturnType<typeof spawn> | null = null;
    let isCancelled = false;
    const progressParser = new GitCloneProgressParser();

    const clonePromise = new Promise<void>((resolvePromise, reject) => {
      const env: Record<string, string> = {
        ...process.env,
        GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=accept-new',
      };

      gitProcess = spawn(
        'git',
        ['clone', '--progress', sanitizedUrl, clonePath],
        { env },
      );
      let stderr = '';

      // Set up abort handling
      if (options.signal) {
        const abortHandler = async () => {
          isCancelled = true;
          if (gitProcess && !gitProcess.killed) {
            // Clean up event listeners first
            gitProcess.stdout?.removeAllListeners();
            gitProcess.stderr?.removeAllListeners();
            gitProcess.removeAllListeners();

            // Try graceful shutdown first (SIGTERM)
            gitProcess.kill('SIGTERM');

            // Wait for process to exit, force kill if timeout
            await new Promise<void>((resolve) => {
              const forceKillTimeout = setTimeout(() => {
                if (gitProcess && !gitProcess.killed) {
                  gitProcess.kill('SIGKILL');
                }
                resolve();
              }, 1000);

              // Clear timeout if process exits gracefully
              if (gitProcess) {
                gitProcess.once('exit', () => {
                  clearTimeout(forceKillTimeout);
                  resolve();
                });
              } else {
                clearTimeout(forceKillTimeout);
                resolve();
              }
            });
          }
          reject(new Error('Clone operation cancelled by user'));
        };

        options.signal.addEventListener('abort', abortHandler);
      }

      // Parse progress from stderr
      gitProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;

        if (options.onProgress) {
          const progress = progressParser.parse(output);
          if (progress) {
            options.onProgress(progress);
          }
        }
      });

      gitProcess.on('error', (error) => {
        reject(error);
      });

      gitProcess.on('close', (code) => {
        // Don't reject again if already cancelled
        if (isCancelled) {
          return;
        }

        if (code === 0) {
          // Send 100% progress on completion
          if (options.onProgress) {
            options.onProgress({
              percent: 100,
              message: 'Clone completed',
            });
          }
          resolvePromise();
        } else {
          reject(new Error(stderr || `Git clone exited with code ${code}`));
        }
      });
    });

    // Add timeout
    const timeoutMinutes = options.timeoutMinutes || 30;
    const CLONE_TIMEOUT = timeoutMinutes * 60 * 1000;
    let timeoutId: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(async () => {
        if (gitProcess) {
          // Clean up event listeners first
          gitProcess.stdout?.removeAllListeners();
          gitProcess.stderr?.removeAllListeners();
          gitProcess.removeAllListeners();

          // Try graceful shutdown first (SIGTERM)
          gitProcess.kill('SIGTERM');

          // Wait for process to exit, force kill if timeout
          await new Promise<void>((resolve) => {
            const forceKillTimeout = setTimeout(() => {
              if (gitProcess && !gitProcess.killed) {
                gitProcess.kill('SIGKILL');
              }
              resolve();
            }, 1000);

            // Clear timeout if process exits gracefully
            if (gitProcess) {
              gitProcess.once('exit', () => {
                clearTimeout(forceKillTimeout);
                resolve();
              });
            } else {
              clearTimeout(forceKillTimeout);
              resolve();
            }
          });
        }
        reject(
          new Error(
            'Clone operation timed out. The repository might be too large or the connection is slow.',
          ),
        );
      }, CLONE_TIMEOUT);
    });

    try {
      await Promise.race([clonePromise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    return {
      success: true,
      clonePath,
      repoName,
    };
  } catch (error: any) {
    // Clean up incomplete clone directory
    if (clonePath && existsSync(clonePath)) {
      try {
        rmSync(clonePath, { recursive: true, force: true });
      } catch (_cleanupError) {
        // Ignore cleanup errors
      }
    }

    // Handle common git clone errors
    const errorMessage = error.message || 'Unknown error';

    // SSH-related errors
    if (
      errorMessage.includes('Host key verification failed') ||
      errorMessage.includes('Permission denied (publickey)')
    ) {
      return {
        success: false,
        error:
          'SSH authentication failed. Please ensure your SSH keys are properly configured.',
        errorCode: 'SSH_AUTH_FAILED',
      };
    }

    // HTTPS authentication errors
    if (
      errorMessage.includes('Authentication failed') ||
      errorMessage.includes('could not read Username') ||
      errorMessage.includes('could not read Password')
    ) {
      return {
        success: false,
        error: 'Authentication required. Please provide username and password.',
        errorCode: 'AUTH_REQUIRED',
        needsCredentials: true,
      };
    }

    if (errorMessage.includes('Could not resolve hostname')) {
      return {
        success: false,
        error:
          'Could not resolve hostname. Please check your internet connection and the repository URL.',
        errorCode: 'NETWORK_ERROR',
      };
    }

    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return {
        success: false,
        error: 'Repository not found or access denied',
        errorCode: 'REPO_NOT_FOUND',
      };
    }

    // Timeout errors
    if (errorMessage.includes('timed out')) {
      return {
        success: false,
        error:
          'Clone operation timed out. The repository might be too large or the connection is slow.',
        errorCode: 'TIMEOUT',
      };
    }

    // User cancelled
    if (errorMessage.includes('cancelled by user')) {
      return {
        success: false,
        error: 'Clone operation cancelled by user',
        errorCode: 'CANCELLED',
      };
    }

    return {
      success: false,
      error: 'Failed to clone repository. Please check the URL and try again.',
      errorCode: 'UNKNOWN',
    };
  }
}

/**
 * Get the staged diff while handling large files
 * - Excludes common lockfiles and large file types
 * - Limits diff size to prevent context overflow
 */
export async function getStagedDiff(cwd: string): Promise<string> {
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
  ];

  const args = ['diff', '--cached', '--', ...excludePatterns];

  const { code, stdout: diff, stderr } = await gitExec(cwd, args);

  if (code !== 0) {
    const errorMessage = stderr || 'Unknown error';

    if (errorMessage.includes('bad revision')) {
      throw new Error(
        'Failed to get staged diff: Invalid Git revision or corrupt repository',
      );
    }

    if (errorMessage.includes('fatal: not a git repository')) {
      throw new Error('Not a Git repository');
    }

    throw new Error(`Failed to get staged diff: ${errorMessage}`);
  }

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
