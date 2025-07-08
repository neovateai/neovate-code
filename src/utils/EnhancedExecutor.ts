import { type ChildProcess, execSync, spawn } from 'child_process';
import crypto from 'crypto';
import createDebug from 'debug';
import fs from 'fs';
import { existsSync } from 'fs';
import os from 'os';
import { homedir } from 'os';
import path from 'path';
import { isAbsolute, join, resolve } from 'path';
import shellquote from 'shell-quote';
import { PRODUCT_NAME } from '../constants';
import { logError } from './logger';

const debug = createDebug('takumi:utils:EnhancedExecutor');

const BANNED_COMMANDS = [
  'alias',
  'aria2c',
  'axel',
  'bash',
  'chrome',
  'curl',
  'curlie',
  'eval',
  'firefox',
  'fish',
  'http-prompt',
  'httpie',
  'links',
  'lynx',
  'nc',
  'rm',
  'safari',
  'sh',
  'source',
  'telnet',
  'w3m',
  'wget',
  'xh',
  'zsh',
];

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const SIGTERM_CODE = 143;
const TEMPFILE_PREFIX = os.tmpdir() + `/${PRODUCT_NAME.toLowerCase()}-`;
const FILE_SUFFIXES = {
  STATUS: '-status',
  STDOUT: '-stdout',
  STDERR: '-stderr',
  CWD: '-cwd',
};
const SHELL_CONFIGS: Record<string, string> = {
  '/bin/bash': '.bashrc',
  '/bin/zsh': '.zshrc',
};

type ExecResult = {
  success: boolean;
  command: string;
  timeout: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  interrupted: boolean;
  backgroundPIDs?: number[];
  error?: string;
  message?: string;
};

type QueuedCommand = {
  command: string;
  abortSignal?: AbortSignal;
  timeout?: number;
  resolve: (result: ExecResult) => void;
  reject: (error: Error) => void;
};

function getCommandRoot(command: string): string | undefined {
  return command
    .trim()
    .replace(/[{}()]/g, '')
    .split(/[\s;&|]+/)[0]
    ?.split(/[/\\]/)
    .pop();
}

function isHighRiskCommand(command: string): boolean {
  const highRiskPatterns = [
    /rm\s+.*(-rf|--recursive)/i,
    /sudo/i,
    /curl.*\|.*sh/i,
    /wget.*\|.*sh/i,
    /dd\s+if=/i,
    /mkfs/i,
    /fdisk/i,
    /format/i,
    /del\s+.*\/[qs]/i,
  ];

  if (command.includes('$(') || command.includes('`')) {
    return true;
  }

  const commandRoot = getCommandRoot(command);
  if (!commandRoot) {
    return true;
  }

  return (
    highRiskPatterns.some((pattern) => pattern.test(command)) ||
    BANNED_COMMANDS.includes(commandRoot.toLowerCase())
  );
}

function validateCommand(command: string): string | null {
  if (!command.trim()) {
    return 'Command cannot be empty.';
  }

  const commandRoot = getCommandRoot(command);
  if (!commandRoot) {
    return 'Could not identify command root.';
  }

  if (command.includes('$(') || command.includes('`')) {
    return 'Command substitution is not allowed for security reasons.';
  }

  if (BANNED_COMMANDS.includes(commandRoot.toLowerCase())) {
    return `Command '${commandRoot}' is not allowed for security reasons. Banned commands: ${BANNED_COMMANDS.join(', ')}`;
  }

  return null;
}

export class EnhancedExecutor {
  private static instance: EnhancedExecutor | null = null;
  private commandQueue: QueuedCommand[] = [];
  private isExecuting: boolean = false;
  private shell: ChildProcess;
  private isAlive: boolean = true;
  private commandInterrupted: boolean = false;
  private statusFile!: string;
  private stdoutFile!: string;
  private stderrFile!: string;
  private cwdFile!: string;
  private cwd: string;
  private binShell: string;

  private constructor(cwd: string) {
    this.binShell = process.env.SHELL || '/bin/bash';
    this.cwd = cwd;

    this.shell = spawn(this.binShell, ['-l'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
      env: {
        ...process.env,
        GIT_EDITOR: 'true',
      },
    });

    this.shell.on('exit', (code, signal) => {
      if (code) {
        logError({
          error: `Shell exited with code ${code} and signal ${signal}`,
        });
        debug('shell exited with code %s and signal %s', code, signal);
      }
      this.cleanup();
      this.isAlive = false;
    });

    this.initializeTempFiles();
    this.loadShellConfig();
  }

  private initializeTempFiles(): void {
    const id = Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');

    this.statusFile = TEMPFILE_PREFIX + id + FILE_SUFFIXES.STATUS;
    this.stdoutFile = TEMPFILE_PREFIX + id + FILE_SUFFIXES.STDOUT;
    this.stderrFile = TEMPFILE_PREFIX + id + FILE_SUFFIXES.STDERR;
    this.cwdFile = TEMPFILE_PREFIX + id + FILE_SUFFIXES.CWD;

    for (const file of [this.statusFile, this.stdoutFile, this.stderrFile]) {
      fs.writeFileSync(file, '');
    }
    fs.writeFileSync(this.cwdFile, this.cwd);
  }

  private loadShellConfig(): void {
    const configFile = SHELL_CONFIGS[this.binShell];
    if (configFile) {
      const configFilePath = join(homedir(), configFile);
      if (existsSync(configFilePath)) {
        this.sendToShell(`source ${configFilePath}`);
      }
    }
  }

  private cleanup(): void {
    for (const file of [
      this.statusFile,
      this.stdoutFile,
      this.stderrFile,
      this.cwdFile,
    ]) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
  }

  static getInstance(cwd?: string): EnhancedExecutor {
    if (!EnhancedExecutor.instance || !EnhancedExecutor.instance.isAlive) {
      EnhancedExecutor.instance = new EnhancedExecutor(cwd || process.cwd());
    }
    return EnhancedExecutor.instance;
  }

  static restart(): void {
    if (EnhancedExecutor.instance) {
      EnhancedExecutor.instance.close();
      EnhancedExecutor.instance = null;
    }
  }

  async execute(
    command: string,
    options: {
      timeout?: number;
      abortSignal?: AbortSignal;
      isolated?: boolean;
    } = {},
  ): Promise<ExecResult> {
    const {
      timeout = DEFAULT_TIMEOUT,
      abortSignal,
      isolated = false,
    } = options;
    const actualTimeout = Math.min(timeout, MAX_TIMEOUT);

    // Security validation first
    const validationError = validateCommand(command);
    if (validationError) {
      return {
        success: false,
        command,
        timeout: actualTimeout,
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: validationError,
        interrupted: false,
        error: validationError,
      };
    }

    if (isolated) {
      return this.executeIsolated(command, actualTimeout);
    }

    return this.executePersistent(command, actualTimeout, abortSignal);
  }

  private async executeIsolated(
    command: string,
    timeout: number,
  ): Promise<ExecResult> {
    const isWindows = os.platform() === 'win32';
    const tempFileName = `shell_pgrep_${crypto.randomBytes(6).toString('hex')}.tmp`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    const wrappedCommand = isWindows
      ? command
      : (() => {
          let cmd = command.trim();
          if (!cmd.endsWith('&')) cmd += ';';
          return `{ ${cmd} }; __code=$?; pgrep -g 0 >${tempFilePath} 2>&1; exit $__code;`;
        })();

    return new Promise((resolve) => {
      const shell = isWindows
        ? spawn('cmd.exe', ['/c', wrappedCommand], {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: this.cwd,
          })
        : spawn('bash', ['-c', wrappedCommand], {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: true,
            cwd: this.cwd,
          });

      let exited = false;
      let stdout = '';
      let stderr = '';
      let error: Error | null = null;
      let code: number | null = null;
      let processSignal: NodeJS.Signals | null = null;

      const timeoutId = setTimeout(() => {
        if (!exited && shell.pid) {
          if (isWindows) {
            spawn('taskkill', ['/pid', shell.pid.toString(), '/f', '/t']);
          } else {
            try {
              process.kill(-shell.pid, 'SIGTERM');
              setTimeout(() => {
                if (shell.pid && !exited) {
                  process.kill(-shell.pid, 'SIGKILL');
                }
              }, 200);
            } catch {
              shell.kill('SIGKILL');
            }
          }
        }
      }, timeout);

      shell.stdout?.on('data', (data: Buffer) => {
        if (!exited) {
          stdout += data.toString().replace(/\x1b\[[0-9;]*m/g, '');
        }
      });

      shell.stderr?.on('data', (data: Buffer) => {
        if (!exited) {
          stderr += data.toString().replace(/\x1b\[[0-9;]*m/g, '');
        }
      });

      shell.on('error', (err: Error) => {
        error = err;
        error.message = error.message.replace(wrappedCommand, command);
      });

      shell.on(
        'exit',
        (_code: number | null, _signal: NodeJS.Signals | null) => {
          exited = true;
          code = _code;
          processSignal = _signal;
          clearTimeout(timeoutId);

          const backgroundPIDs: number[] = [];
          if (!isWindows && fs.existsSync(tempFilePath)) {
            try {
              const pgrepLines = fs
                .readFileSync(tempFilePath, 'utf8')
                .split('\n')
                .filter(Boolean);
              for (const line of pgrepLines) {
                if (/^\d+$/.test(line)) {
                  const pid = Number(line);
                  if (pid !== shell.pid) {
                    backgroundPIDs.push(pid);
                  }
                }
              }
              fs.unlinkSync(tempFilePath);
            } catch {
              // Ignore cleanup errors
            }
          }

          const result: ExecResult = {
            success: !error && code === 0 && !processSignal,
            command,
            timeout,
            exitCode: code,
            signal: processSignal,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            interrupted: false,
            backgroundPIDs:
              backgroundPIDs.length > 0 ? backgroundPIDs : undefined,
          };

          if (error || code !== 0 || processSignal) {
            result.error = error?.message || `Command exited with code ${code}`;
          } else {
            result.message = stdout.trim() || 'Command executed successfully';
          }

          resolve(result);
        },
      );
    });
  }

  private async executePersistent(
    command: string,
    timeout: number,
    abortSignal?: AbortSignal,
  ): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      this.commandQueue.push({
        command,
        abortSignal,
        timeout,
        resolve,
        reject,
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isExecuting || this.commandQueue.length === 0) return;

    this.isExecuting = true;
    const { command, abortSignal, timeout, resolve, reject } =
      this.commandQueue.shift()!;

    const killChildren = () => this.killChildren();
    if (abortSignal) {
      abortSignal.addEventListener('abort', killChildren);
    }

    try {
      const result = await this.execPersistent(command, timeout);
      resolve(result);
    } catch (error) {
      reject(error as Error);
    } finally {
      this.isExecuting = false;
      if (abortSignal) {
        abortSignal.removeEventListener('abort', killChildren);
      }
      this.processQueue();
    }
  }

  private async execPersistent(
    command: string,
    timeout?: number,
  ): Promise<ExecResult> {
    const quotedCommand = shellquote.quote([command]);
    const commandTimeout = timeout || DEFAULT_TIMEOUT;

    // Syntax check
    try {
      execSync(`${this.binShell} -n -c ${quotedCommand}`, {
        stdio: 'ignore',
        timeout: 1000,
      });
    } catch (syntaxError) {
      const errorStr =
        typeof syntaxError === 'string'
          ? syntaxError
          : String(syntaxError || '');
      return {
        success: false,
        command,
        timeout: commandTimeout,
        exitCode: 128,
        signal: null,
        stdout: '',
        stderr: errorStr,
        interrupted: false,
        error: errorStr,
      };
    }

    this.commandInterrupted = false;
    return new Promise<ExecResult>((resolve) => {
      // Clear output files
      fs.writeFileSync(this.stdoutFile, '');
      fs.writeFileSync(this.stderrFile, '');
      fs.writeFileSync(this.statusFile, '');

      const commandParts = [
        `eval ${quotedCommand} < /dev/null > ${this.stdoutFile} 2> ${this.stderrFile}`,
        `EXEC_EXIT_CODE=$?`,
        `pwd > ${this.cwdFile}`,
        `echo $EXEC_EXIT_CODE > ${this.statusFile}`,
      ];

      this.sendToShell(commandParts.join('\n'));

      const start = Date.now();
      const checkCompletion = setInterval(() => {
        try {
          let statusFileSize = 0;
          if (fs.existsSync(this.statusFile)) {
            statusFileSize = fs.statSync(this.statusFile).size;
          }

          if (
            statusFileSize > 0 ||
            Date.now() - start > commandTimeout ||
            this.commandInterrupted
          ) {
            clearInterval(checkCompletion);
            const stdout = fs.existsSync(this.stdoutFile)
              ? fs.readFileSync(this.stdoutFile, 'utf8')
              : '';
            let stderr = fs.existsSync(this.stderrFile)
              ? fs.readFileSync(this.stderrFile, 'utf8')
              : '';
            let code: number;
            if (statusFileSize) {
              code = Number(fs.readFileSync(this.statusFile, 'utf8'));
            } else {
              this.killChildren();
              code = SIGTERM_CODE;
              stderr += (stderr ? '\n' : '') + 'Command execution timed out';
            }

            const result: ExecResult = {
              success: code === 0 && !this.commandInterrupted,
              command,
              timeout: commandTimeout,
              exitCode: code,
              signal: null,
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              interrupted: this.commandInterrupted,
            };

            if (code !== 0 || this.commandInterrupted) {
              result.error = this.commandInterrupted
                ? 'Command was interrupted'
                : `Command exited with code ${code}`;
            } else {
              result.message = stdout.trim() || 'Command executed successfully';
            }

            resolve(result);
          }
        } catch {
          // Ignore file system errors during polling
        }
      }, 10);
    });
  }

  private killChildren(): void {
    const parentPid = this.shell.pid;
    try {
      const childPids = execSync(`pgrep -P ${parentPid}`)
        .toString()
        .trim()
        .split('\n')
        .filter(Boolean);

      if (childPids.length > 0) {
        debug('command interrupted with %s child processes', childPids.length);
      }

      childPids.forEach((pid) => {
        try {
          process.kill(Number(pid), 'SIGTERM');
        } catch (error) {
          logError({
            error: `Failed to kill process ${pid}: ${error}`,
          });
        }
      });
    } catch {
      // pgrep returns non-zero when no processes are found - this is expected
    } finally {
      this.commandInterrupted = true;
    }
  }

  private sendToShell(command: string): void {
    try {
      this.shell!.stdin!.write(command + '\n');
    } catch (error) {
      const errorString =
        error instanceof Error
          ? error.message
          : String(error || 'Unknown error');
      logError({
        error: `Error in sendToShell: ${errorString}`,
      });
      throw error;
    }
  }

  pwd(): string {
    try {
      const newCwd = fs.readFileSync(this.cwdFile, 'utf8').trim();
      if (newCwd) {
        this.cwd = newCwd;
      }
    } catch (error) {
      logError({
        error: `Enhanced executor pwd error ${error}`,
      });
    }
    return this.cwd;
  }

  async setCwd(cwd: string): Promise<void> {
    const resolved = isAbsolute(cwd) ? cwd : resolve(process.cwd(), cwd);
    if (!existsSync(resolved)) {
      throw new Error(`Path "${resolved}" does not exist`);
    }
    await this.execute(`cd ${resolved}`);
  }

  close(): void {
    this.cleanup();
    this.shell!.stdin!.end();
    this.shell.kill();
  }

  // Static methods for backward compatibility
  static async executeCommand(
    command: string,
    timeout: number,
    cwd: string,
  ): Promise<any> {
    const executor = EnhancedExecutor.getInstance(cwd);
    return executor.execute(command, { timeout, isolated: false });
  }

  static isHighRiskCommand = isHighRiskCommand;
  static getCommandRoot = getCommandRoot;
  static validateCommand = validateCommand;
  static BANNED_COMMANDS = BANNED_COMMANDS;
}
