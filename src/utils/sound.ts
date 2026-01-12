import fs from 'fs';
import { spawn } from 'child_process';

const SYSTEM_SOUNDS_DIR = '/System/Library/Sounds';

export const SOUND_PRESETS = {
  success: 'Glass',
  error: 'Basso',
  warning: 'Funk',
  info: 'Pop',
  done: 'Hero',
} as const;

export type SoundPreset = keyof typeof SOUND_PRESETS;

export function beep(): void {
  process.stdout.write('\x07');
}

export async function playSound(
  name: string,
  volume: number = 1.0,
): Promise<void> {
  if (process.platform !== 'darwin') {
    beep();
    return;
  }

  const soundPath = `${SYSTEM_SOUNDS_DIR}/${name}.aiff`;

  return new Promise((resolve, reject) => {
    const args = ['-v', String(volume), soundPath];
    const proc = spawn('afplay', args, { stdio: 'ignore' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`afplay exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

export const success = (volume?: number) =>
  playSound(SOUND_PRESETS.success, volume);
export const error = (volume?: number) =>
  playSound(SOUND_PRESETS.error, volume);
export const warning = (volume?: number) =>
  playSound(SOUND_PRESETS.warning, volume);
export const info = (volume?: number) => playSound(SOUND_PRESETS.info, volume);
export const done = (volume?: number) => playSound(SOUND_PRESETS.done, volume);

export async function listSounds(): Promise<string[]> {
  if (process.platform !== 'darwin') {
    return [];
  }
  try {
    const files = fs.readdirSync(SYSTEM_SOUNDS_DIR);
    return files
      .filter((file) => file.endsWith('.aiff'))
      .map((file) => file.replace('.aiff', ''))
      .sort();
  } catch {
    return [];
  }
}
