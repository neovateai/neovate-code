import os from 'os';

export function relativeToHome(p: string) {
  return p.replace(os.homedir(), '~');
}
