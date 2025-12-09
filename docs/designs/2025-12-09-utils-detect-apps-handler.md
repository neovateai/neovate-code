# utils.detectApps Handler

## Purpose

Show users what development tools are available on their system for status display.

## Types

```typescript
// In nodeBridge.types.ts

type App =
  | 'cursor'
  | 'vscode'
  | 'vscode-insiders'
  | 'zed'
  | 'windsurf'
  | 'iterm'
  | 'warp'
  | 'terminal'
  | 'antigravity'
  | 'finder'
  | 'sourcetree';

type UtilsDetectAppsInput = {
  cwd: string;
  apps?: App[];  // if omitted, detect all
};

type UtilsDetectAppsOutput = {
  success: boolean;
  data: {
    apps: App[];  // list of installed apps
  };
};

// Add to HandlerMap:
'utils.detectApps': { input: UtilsDetectAppsInput; output: UtilsDetectAppsOutput };
```

Note: Extract `App` type to be shared with existing `UtilsOpenInput`.

## Handler Implementation

```typescript
// In nodeBridge.ts

this.messageBus.registerHandler('utils.detectApps', async (data) => {
  const { apps: appsToCheck } = data;
  const { existsSync } = await import('fs');
  const { execSync } = await import('child_process');

  const allApps = [
    'cursor', 'vscode', 'vscode-insiders', 'zed', 'windsurf',
    'iterm', 'warp', 'terminal', 'antigravity', 'finder', 'sourcetree'
  ] as const;

  const cliCommands: Record<string, string> = {
    cursor: 'cursor',
    vscode: 'code',
    'vscode-insiders': 'code-insiders',
    zed: 'zed',
    windsurf: 'windsurf',
    antigravity: 'agy',
  };

  const macApps: Record<string, string> = {
    iterm: '/Applications/iTerm.app',
    warp: '/Applications/Warp.app',
    terminal: '/Applications/Utilities/Terminal.app',
    finder: '/System/Applications/Finder.app',
    sourcetree: '/Applications/Sourcetree.app',
  };

  const checkApp = (app: string): boolean => {
    if (cliCommands[app]) {
      try {
        execSync(`which ${cliCommands[app]}`, { stdio: 'ignore' });
        return true;
      } catch { return false; }
    }
    if (macApps[app]) {
      return existsSync(macApps[app]);
    }
    return false;
  };

  const targetApps = appsToCheck || [...allApps];
  const installedApps = targetApps.filter(checkApp);

  return { success: true, data: { apps: installedApps } };
});
```

## Detection Strategy

- **CLI apps**: Use `which <command>` to check if CLI commands exist
- **GUI apps (macOS)**: Check `/Applications` directory for `.app` bundles

## CLI Command Mapping

| App | Command |
|-----|---------|
| cursor | `cursor` |
| vscode | `code` |
| vscode-insiders | `code-insiders` |
| zed | `zed` |
| windsurf | `windsurf` |
| antigravity | `agy` |

## macOS App Paths

| App | Path |
|-----|------|
| iterm | `/Applications/iTerm.app` |
| warp | `/Applications/Warp.app` |
| terminal | `/Applications/Utilities/Terminal.app` |
| finder | `/System/Applications/Finder.app` |
| sourcetree | `/Applications/Sourcetree.app` |
