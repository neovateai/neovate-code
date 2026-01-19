# Notification Sound Error Handling

**Date:** 2026-01-19

## Context

The notification plugin (`src/plugins/notification.ts`) uses `playSound()` to play a sound when a session stops. However, when `afplay` (macOS audio player) fails with exit code 1, an unhandled promise rejection occurs:

```
Error: afplay exited with code 1
    at ChildProcess.<anonymous>
```

The root cause is that `playSound()` returns a `Promise<void>`, but the caller was not using `await`, making the `try/catch` block ineffective for catching promise rejections.

## Discussion

### Problem Analysis

The original code:
```typescript
try {
  playSound(soundName);
} catch {}
```

Issues identified:
1. Missing `await` keyword - `try/catch` cannot catch Promise rejections without `await`
2. When `afplay` fails (file not found, audio device issues, permissions), the rejection becomes unhandled

### Possible `afplay` Failure Causes

- Sound file does not exist (user configured a non-existent sound name)
- Audio device is busy or unavailable
- Permission issues

### Fix Options Considered

1. **Silent ignore**: Add `await` and keep empty catch - errors are swallowed silently
2. **Fallback to beep**: When `playSound` fails, fall back to terminal beep sound
3. **Log warning**: Catch error and print warning for debugging

## Approach

The chosen solution is **fallback to beep**. When `playSound` fails for any reason, the system falls back to using the terminal beep sound (`\x07`). This ensures:

1. Users still receive audio notification even when `afplay` fails
2. No unhandled promise rejections
3. Graceful degradation without silent failure

## Architecture

### Changes Made

**File:** `src/plugins/notification.ts`

1. Import `beep` function from `../utils/sound`:
```typescript
import { beep, playSound, SOUND_PRESETS } from '../utils/sound';
```

2. Add `await` and fallback logic:
```typescript
try {
  await playSound(soundName);
} catch {
  beep();
}
```

### Flow

```
stop() called
    │
    ▼
Check quiet mode / notification config
    │
    ▼
Try playSound(soundName)
    │
    ├── Success → Sound plays
    │
    └── Failure → beep() fallback
```

The `beep()` function simply writes `\x07` to stdout, which triggers the terminal bell - a universal fallback that works on all platforms.
