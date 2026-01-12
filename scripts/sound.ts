#!/usr/bin/env bun

import { spawn } from 'child_process';

const SYSTEM_SOUNDS_DIR = '/System/Library/Sounds';

const SOUND_PRESETS = {
  success: 'Glass',
  error: 'Basso',
  warning: 'Funk',
  info: 'Pop',
  done: 'Hero',
} as const;

type SoundPreset = keyof typeof SOUND_PRESETS;

interface ParsedArgs {
  help: boolean;
  list: boolean;
  beep: boolean;
  preset?: SoundPreset;
  sound?: string;
  volume?: number;
}

function parseArgs(): ParsedArgs {
  const args = Bun.argv.slice(2);
  const result: ParsedArgs = {
    help: false,
    list: false,
    beep: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        result.help = true;
        break;
      case '-l':
      case '--list':
        result.list = true;
        break;
      case '-b':
      case '--beep':
        result.beep = true;
        break;
      case '-s':
      case '--sound':
        result.sound = args[++i];
        break;
      case '-v':
      case '--volume':
        result.volume = parseFloat(args[++i]);
        break;
      case '--success':
        result.preset = 'success';
        break;
      case '--error':
        result.preset = 'error';
        break;
      case '--warning':
        result.preset = 'warning';
        break;
      case '--info':
        result.preset = 'info';
        break;
      case '--done':
        result.preset = 'done';
        break;
    }
  }
  return result;
}

function showHelp(): void {
  console.log(`
Usage: bun scripts/sound.ts [options]

Play notification sounds in terminal. Supports system sounds on macOS.

Options:
  -h, --help       Show this help message
  -l, --list       List available system sounds
  -b, --beep       Play terminal bell (cross-platform)
  -s, --sound NAME Play a specific system sound by name
  -v, --volume N   Set volume (0.0 to 1.0, default: 1.0)

Presets:
  --success        Play success sound (Glass)
  --error          Play error sound (Basso)
  --warning        Play warning sound (Funk)
  --info           Play info sound (Pop)
  --done           Play done sound (Hero)

Examples:
  bun scripts/sound.ts --success
  bun scripts/sound.ts --error
  bun scripts/sound.ts --beep
  bun scripts/sound.ts -s Ping
  bun scripts/sound.ts -s Glass -v 0.5
  bun scripts/sound.ts --list

Importable functions:
  import { playSound, beep, success, error, warning } from "./scripts/sound.ts"
`);
}

export async function listSounds(): Promise<string[]> {
  const glob = new Bun.Glob('*.aiff');
  const files: string[] = [];
  for await (const file of glob.scan(SYSTEM_SOUNDS_DIR)) {
    files.push(file.replace('.aiff', ''));
  }
  return files.sort();
}

export function beep(): void {
  process.stdout.write('\x07');
}

export async function playSound(
  name: string,
  volume: number = 1.0,
): Promise<void> {
  const soundPath = `${SYSTEM_SOUNDS_DIR}/${name}.aiff`;
  const file = Bun.file(soundPath);
  if (!(await file.exists())) {
    throw new Error(`Sound not found: ${name}`);
  }

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

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.list) {
    const sounds = await listSounds();
    console.log('Available system sounds:');
    sounds.forEach((s) => console.log(`  ${s}`));
    process.exit(0);
  }

  if (args.beep) {
    beep();
    return;
  }

  if (args.preset) {
    await playSound(SOUND_PRESETS[args.preset], args.volume);
    return;
  }

  if (args.sound) {
    await playSound(args.sound, args.volume);
    return;
  }

  beep();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
