import type { Plugin } from '../plugin';
import { playSound, SOUND_PRESETS } from '../utils/sound';

export const notificationSoundPlugin: Plugin = {
  name: 'notificationSound',

  async stop() {
    const config = this.config.notification;
    if (config === false) {
      return;
    }

    const soundName =
      typeof config === 'string' ? config : SOUND_PRESETS.warning;

    try {
      playSound(soundName);
    } catch {}
  },
};
