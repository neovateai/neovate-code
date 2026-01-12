# Notification Webhook URL Support

**Date:** 2026-01-12

## Context

The notification plugin currently only supports playing system sounds when the agent stops. There was a need to extend this to support webhook notifications - firing HTTP requests to external URLs when the agent completes, enabling integration with external services, logging systems, or custom notification handlers.

## Discussion

Key questions explored:

1. **What happens with a URL config?** - The URL should be fetched via GET request without waiting for response. No sound playback needed.

2. **Variable substitution** - URLs should support template variables like `{{cwd}}` and `{{dirname}}` to include context about the current session.

3. **Variable definitions:**
   - `cwd` - Project root directory (`this.cwd`)
   - `name` - Project directory name (`pathe.basename(this.cwd)`)

4. **Fetch behavior** - Fire-and-forget: make the request but don't wait for response or handle errors.

5. **HTTP method** - GET requests only.

## Approach

Extend the existing `notification` config to detect URLs (matching `^https?://`) and handle them differently from sound names:

- If config is a URL: replace variables and fire a GET request
- If config is a string (non-URL): treat as sound name (existing behavior)
- If config is `false`: do nothing (existing behavior)

## Architecture

```
notification.ts
├── replaceVars(url, vars) - Replace {{key}} patterns with values
└── stop() hook
    ├── Check if config is URL (regex: ^https?://)
    │   ├── Build vars object { cwd, name }
    │   ├── Replace vars in URL
    │   └── fetch(url).catch(() => {}) - fire and forget
    └── Otherwise play sound (existing logic)
```

Variable replacement uses `{{varName}}` syntax, e.g.:
```
https://example.com/webhook?project={{name}}&cwd={{cwd}}
```

## Implementation

```typescript
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
```
