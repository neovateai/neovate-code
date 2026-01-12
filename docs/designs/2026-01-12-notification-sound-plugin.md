# Notification Sound Plugin

**Date:** 2026-01-12

## Context

Users wanted audible notifications when Neovate Code completes a session/conversation. This is useful when running long tasks where the user may switch to other windows and wants to be alerted when the agent finishes.

The goal was to add a built-in plugin that plays a notification sound when the `stop` hook is triggered.

## Discussion

### Sound Implementation Options

Two approaches were considered for playing sounds:

1. **afplay wrapper (macOS-specific)** - Uses macOS `afplay` command to play system sounds from `/System/Library/Sounds/`. Zero dependencies, simple, reliable, supports volume control.

2. **Terminal bell + afplay hybrid** - Uses terminal bell (`\a`) for cross-platform fallback, with `afplay` for richer sounds on macOS.

**Decision:** Hybrid approach - use `afplay` on macOS with terminal bell fallback for other platforms.

### Configuration Questions

| Question | Decision |
|----------|----------|
| Different sounds for success vs error? | No - same sound regardless of result |
| Should it be configurable? | Yes - via config to enable/disable or change sound |
| Notify on `subagentStop` hook? | No - only notify when main session stops |

### Sound Selection

Default sound: **Funk** (warning preset) - distinct enough to be noticed without being jarring.

Available macOS system sounds: Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink.

### Config Naming

The config key is named `notification` (not `notificationSound`) to allow future extension for other notification types (e.g., URL webhooks).

## Approach

1. Create reusable sound utilities in `src/utils/sound.ts`
2. Create a built-in plugin `notificationSoundPlugin` with a `stop` hook
3. Add `notification` config option supporting boolean or custom sound name
4. Register the plugin in `context.ts` as a built-in plugin

## Architecture

### Files

```
src/
├── utils/
│   └── sound.ts              # Sound utilities (playSound, beep, presets)
├── plugins/
│   └── notificationSound.ts  # Built-in plugin with stop hook
├── config.ts                 # Added notification config option
└── context.ts                # Registered plugin in buildInPlugins
```

### Config Schema

```typescript
type Config = {
  // ...existing fields
  /**
   * Notification configuration.
   * - true: play default sound (Funk/warning)
   * - false: disabled
   * - string: custom sound name (e.g., "Glass", "Ping")
   * - object: extended notification config (reserved for future use, e.g., url)
   */
  notification?: boolean | string;
};
```

### Usage Examples

```json
{ "notification": true }        // Enable with default sound (Funk)
{ "notification": "Glass" }     // Custom sound
{ "notification": false }       // Disabled (default behavior)
```

### Sound Utilities API

```typescript
// Presets
export const SOUND_PRESETS = {
  success: "Glass",
  error: "Basso", 
  warning: "Funk",
  info: "Pop",
  done: "Hero",
};

// Functions
export function beep(): void;  // Terminal bell (cross-platform)
export async function playSound(name: string, volume?: number): Promise<void>;
export async function listSounds(): Promise<string[]>;  // Get available sound names
export const success: (volume?: number) => Promise<void>;
export const error: (volume?: number) => Promise<void>;
export const warning: (volume?: number) => Promise<void>;
```

The `listSounds()` function scans `/System/Library/Sounds/` and returns available sound names for user selection or validation. Returns empty array on non-macOS platforms.

### Plugin Implementation

```typescript
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
      await playSound(soundName);
    } catch {}
  },
};
```

### Platform Support

- **macOS**: Full support using `afplay` with system sounds
- **Linux/Windows**: Falls back to terminal bell (`\x07`)
