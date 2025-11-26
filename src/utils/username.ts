import os from 'os';
import { basename } from 'pathe';

export function getUsername(): string | undefined {
  try {
    const username = os.userInfo().username;
    if (username) {
      return username;
    }
  } catch {}

  try {
    const homedir = os.homedir();
    const username = basename(homedir);
    if (username) {
      return username;
    }
  } catch {}

  return undefined;
}
