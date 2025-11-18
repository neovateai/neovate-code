import { BACKGROUND_THRESHOLD_MS } from '../constants';

const DEV_COMMANDS = [
  'npm',
  'pnpm',
  'yarn',
  'node',
  'python',
  'python3',
  'go',
  'cargo',
  'make',
  'docker',
  'webpack',
  'vite',
  'jest',
  'pytest',
];

export function getCommandRoot(command: string): string | undefined {
  return command
    .trim()
    .replace(/[{}()]/g, '')
    .split(/[\s;&|]+/)[0]
    ?.split(/[\/\\]/)
    .pop();
}

export function shouldRunInBackground(
  command: string,
  elapsedMs: number,
  hasOutput: boolean,
  isCommandCompleted: boolean,
  userRequested?: boolean,
): boolean {
  // If command is completed, never move to background
  if (isCommandCompleted) {
    return false;
  }

  // Basic condition checks
  if (elapsedMs < BACKGROUND_THRESHOLD_MS || !hasOutput) {
    return false;
  }

  // User explicitly requested background execution
  if (userRequested) {
    return true;
  }

  // Check if it's a development command
  const commandRoot = getCommandRoot(command);
  if (!commandRoot) {
    return false;
  }

  return DEV_COMMANDS.includes(commandRoot.toLowerCase());
}
