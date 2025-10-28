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

const BACKGROUND_THRESHOLD_MS = 2000;

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
  userRequested?: boolean,
): boolean {
  if (userRequested) {
    return true;
  }

  if (elapsedMs < BACKGROUND_THRESHOLD_MS || !hasOutput) {
    return false;
  }

  const commandRoot = getCommandRoot(command);
  if (!commandRoot) {
    return false;
  }

  return DEV_COMMANDS.includes(commandRoot.toLowerCase());
}
