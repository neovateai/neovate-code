import pathe from 'pathe';
import type { Plugin } from '../plugin';
import { playSound, SOUND_PRESETS } from '../utils/sound';

function replaceVars(url: string, vars: Record<string, string>): string {
  return url.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export const notificationSoundPlugin: Plugin = {
  name: 'notificationSound',

  async stop() {
    const config = this.config.notification;
    if (config === false) {
      return;
    }

    if (typeof config === 'string' && /^https?:\/\//.test(config)) {
      const vars = {
        cwd: this.cwd,
        name: pathe.basename(this.cwd),
      };
      const url = replaceVars(config, vars);
      fetch(url).catch(() => {});
      return;
    }

    const soundName =
      typeof config === 'string' ? config : SOUND_PRESETS.warning;

    try {
      playSound(soundName);
    } catch {}
  },
};
