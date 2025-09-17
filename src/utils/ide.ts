import { execSync, spawnSync } from 'child_process';
import createDebug from 'debug';
import fs from 'fs';

const debug = createDebug('neovate:utils:ide');

// VS Code Extension ID
export const vscode_extension_id = 'sorrycc.neovate-assistant';

// Platform and terminal detection
export interface PlatformInfo {
  terminal: string | null;
  platform: string;
}

// Command result interface
export interface CommandResult {
  code: number;
  stdout?: string;
  stderr?: string;
  error?: string;
}

// Installation result interface
export interface InstallationResult {
  installed: boolean;
  error: string | null;
  installedVersion: string | null;
}

// IDE detection utilities
export function isVSCodeBased(terminal: string | null): boolean {
  return (
    terminal === 'cursor' || terminal === 'windsurf' || terminal === 'vscode'
  );
}

export function isJetBrainsBased(terminal: string | null): boolean {
  return (
    terminal === 'pycharm' ||
    terminal === 'intellij' ||
    terminal === 'webstorm' ||
    terminal === 'phpstorm' ||
    terminal === 'rubymine' ||
    terminal === 'clion' ||
    terminal === 'goland' ||
    terminal === 'rider' ||
    terminal === 'datagrip' ||
    terminal === 'appcode' ||
    terminal === 'dataspell' ||
    terminal === 'aqua' ||
    terminal === 'gateway' ||
    terminal === 'fleet' ||
    terminal === 'androidstudio'
  );
}

export function getMacOSVSCodePath(): string | null {
  try {
    if (process.platform !== 'darwin') return null;

    let pid = process.ppid;
    for (let i = 0; i < 10; i++) {
      if (!pid || pid === 0 || pid === 1) break;

      const command = execSync(`ps -o command= -p ${pid}`, {
        encoding: 'utf8',
      })?.trim();
      if (command) {
        const appMappings = {
          'Visual Studio Code.app': 'code',
          'Cursor.app': 'cursor',
          'Windsurf.app': 'windsurf',
          'Visual Studio Code - Insiders.app': 'code',
          'VSCodium.app': 'codium',
        };

        for (const [appName, cliName] of Object.entries(appMappings)) {
          const searchPath = appName + '/Contents/MacOS/Electron';
          const index = command.indexOf(searchPath);
          if (index !== -1) {
            const appPath = command.substring(0, index + appName.length);
            return appPath + '/Contents/Resources/app/bin/' + cliName;
          }
        }
      }

      const parentPid = execSync(`ps -o ppid= -p ${pid}`, {
        encoding: 'utf8',
      })?.trim();
      if (!parentPid) break;
      pid = parseInt(parentPid.trim());
    }
    return null;
  } catch {
    return null;
  }
}

export function getVSCodeCommand(terminal: string | null): string | null {
  const macOSPath = getMacOSVSCodePath();
  if (macOSPath && fs.existsSync(macOSPath)) {
    return macOSPath;
  }

  switch (terminal) {
    case 'vscode':
      return 'code';
    case 'cursor':
      return 'cursor';
    case 'windsurf':
      return 'windsurf';
    default:
      return null;
  }
}

async function executeCommand(
  command: string,
  args: string[],
  options?: { env?: NodeJS.ProcessEnv },
): Promise<CommandResult> {
  try {
    debug('Executing command:', command, 'with args:', args);

    const result = spawnSync(command, args, {
      encoding: 'utf8',
      env: options?.env || process.env,
    });

    return {
      code: result.status || 0,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      error: result.error?.message,
    };
  } catch (error: any) {
    return {
      code: 1,
      stderr: '',
      error: error.message,
    };
  }
}

export async function isExtensionInstalled(
  platformInfo: PlatformInfo,
): Promise<boolean> {
  if (isVSCodeBased(platformInfo.terminal)) {
    const vscodeCmd = getVSCodeCommand(platformInfo.terminal);
    if (vscodeCmd) {
      try {
        const result = await executeCommand(vscodeCmd, ['--list-extensions'], {
          env: getCleanEnvironment(platformInfo.platform),
        });
        return result.stdout?.includes(vscode_extension_id) ?? false;
      } catch {
        return false;
      }
    }
  } else if (isJetBrainsBased(platformInfo.terminal) && platformInfo.terminal) {
    debug('JetBrains plugin detection not implemented');
    return false;
  }
  return false;
}

export async function installExtension(
  platformInfo: PlatformInfo,
  vsixPath: string,
): Promise<string | null> {
  if (isVSCodeBased(platformInfo.terminal)) {
    const vscodeCmd = getVSCodeCommand(platformInfo.terminal);
    if (vscodeCmd) {
      const version = getExtensionVersion();
      try {
        const result = await executeCommand(
          vscodeCmd,
          ['--force', '--install-extension', vsixPath],
          {
            env: getCleanEnvironment(platformInfo.platform),
          },
        );

        if (result.code !== 0) {
          throw new Error(`${result.code}: ${result.error} ${result.stderr}`);
        }

        return version;
      } catch (error) {
        throw error;
      }
    }
  } else if (
    isJetBrainsBased(platformInfo.terminal) &&
    platformInfo.terminal &&
    platformInfo.platform !== 'wsl'
  ) {
    debug('JetBrains plugin installation not implemented');
    return null;
  }

  return null;
}

export function getCleanEnvironment(platform: string): NodeJS.ProcessEnv {
  if (platform === 'linux') {
    return { ...process.env, DISPLAY: '' };
  }
  return process.env;
}

export function getExtensionVersion(): string {
  return '1.0.22';
}

export async function attemptInstallation(
  platformInfo: PlatformInfo,
  vsixPath: string,
): Promise<InstallationResult> {
  if (!isVSCodeBased(platformInfo.terminal)) {
    return {
      installed: false,
      error: 'Not in supported IDE',
      installedVersion: null,
    };
  }

  try {
    const version = await installExtension(platformInfo, vsixPath);
    debug('Extension installed successfully');

    return {
      installed: true,
      error: null,
      installedVersion: version,
    };
  } catch (error) {
    debug('Extension installation failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    return {
      installed: false,
      error: message,
      installedVersion: null,
    };
  }
}

export function getIDEDisplayName(terminal: string): string {
  const nameMap: Record<string, string> = {
    vscode: 'VS Code',
    cursor: 'Cursor',
    windsurf: 'Windsurf',
    pycharm: 'PyCharm',
    intellij: 'IntelliJ IDEA',
    webstorm: 'WebStorm',
    phpstorm: 'PhpStorm',
    rubymine: 'RubyMine',
    clion: 'CLion',
    goland: 'GoLand',
    rider: 'Rider',
    datagrip: 'DataGrip',
    appcode: 'AppCode',
    dataspell: 'DataSpell',
    aqua: 'Aqua',
    gateway: 'Gateway',
    fleet: 'Fleet',
    androidstudio: 'Android Studio',
  };

  return nameMap[terminal] || terminal;
}

export function isRunningInSupportedIDE(platformInfo: PlatformInfo): boolean {
  return (
    isVSCodeBased(platformInfo.terminal) ||
    Boolean(process.env.FORCE_CODE_TERMINAL)
  );
}
