import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ConfigManager } from './config';

let tempDir: string;
let globalDir: string;
let projectDir: string;

function writeJson(filePath: string, data: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

beforeEach(() => {
  tempDir = path.join(os.tmpdir(), `config-test-${Date.now()}`);
  globalDir = path.join(tempDir, 'home', '.testproduct');
  projectDir = path.join(tempDir, 'project', '.testproduct');
  fs.mkdirSync(globalDir, { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });
  vi.spyOn(os, 'homedir').mockReturnValue(path.join(tempDir, 'home'));
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function createConfigManager(argvConfig: Record<string, any> = {}) {
  return new ConfigManager(
    path.join(tempDir, 'project'),
    'testproduct',
    argvConfig,
  );
}

describe('ConfigManager enabledPlugins merge', () => {
  test('local config false overrides global true for enabledPlugins', () => {
    writeJson(path.join(globalDir, 'config.json'), {
      enabledPlugins: { 'plugin-a@mkt': true },
    });
    writeJson(path.join(projectDir, 'config.json'), {});
    writeJson(path.join(projectDir, 'config.local.json'), {
      enabledPlugins: { 'plugin-a@mkt': false },
    });

    const cm = createConfigManager();
    expect(cm.config.enabledPlugins?.['plugin-a@mkt']).toBe(false);
  });

  test('project config false overrides global true for enabledPlugins', () => {
    writeJson(path.join(globalDir, 'config.json'), {
      enabledPlugins: { 'plugin-a@mkt': true, 'plugin-b@mkt': true },
    });
    writeJson(path.join(projectDir, 'config.json'), {
      enabledPlugins: { 'plugin-a@mkt': false },
    });

    const cm = createConfigManager();
    expect(cm.config.enabledPlugins?.['plugin-a@mkt']).toBe(false);
    expect(cm.config.enabledPlugins?.['plugin-b@mkt']).toBe(true);
  });

  test('local config true overrides project false for enabledPlugins', () => {
    writeJson(path.join(globalDir, 'config.json'), {
      enabledPlugins: { 'plugin-a@mkt': true },
    });
    writeJson(path.join(projectDir, 'config.json'), {
      enabledPlugins: { 'plugin-a@mkt': false },
    });
    writeJson(path.join(projectDir, 'config.local.json'), {
      enabledPlugins: { 'plugin-a@mkt': true },
    });

    const cm = createConfigManager();
    expect(cm.config.enabledPlugins?.['plugin-a@mkt']).toBe(true);
  });

  test('enabledPlugins from multiple layers merge correctly', () => {
    writeJson(path.join(globalDir, 'config.json'), {
      enabledPlugins: { 'g-only@mkt': true, 'shared@mkt': true },
    });
    writeJson(path.join(projectDir, 'config.json'), {
      enabledPlugins: { 'p-only@mkt': true, 'shared@mkt': false },
    });
    writeJson(path.join(projectDir, 'config.local.json'), {
      enabledPlugins: { 'l-only@mkt': true },
    });

    const cm = createConfigManager();
    const ep = cm.config.enabledPlugins!;
    expect(ep['g-only@mkt']).toBe(true);
    expect(ep['p-only@mkt']).toBe(true);
    expect(ep['shared@mkt']).toBe(false);
    expect(ep['l-only@mkt']).toBe(true);
  });
});

describe('ConfigManager.setPluginEnabled', () => {
  test('setPluginEnabled writes to global config', () => {
    writeJson(path.join(globalDir, 'config.json'), {});

    const cm = createConfigManager();
    cm.setPluginEnabled('global', 'plugin-a@mkt', true);

    const raw = JSON.parse(
      fs.readFileSync(path.join(globalDir, 'config.json'), 'utf-8'),
    );
    expect(raw.enabledPlugins?.['plugin-a@mkt']).toBe(true);
  });

  test('setPluginEnabled writes to project config', () => {
    writeJson(path.join(projectDir, 'config.json'), {});

    const cm = createConfigManager();
    cm.setPluginEnabled('project', 'plugin-a@mkt', false);

    const raw = JSON.parse(
      fs.readFileSync(path.join(projectDir, 'config.json'), 'utf-8'),
    );
    expect(raw.enabledPlugins?.['plugin-a@mkt']).toBe(false);
  });

  test('setPluginEnabled writes to local config', () => {
    const cm = createConfigManager();
    cm.setPluginEnabled('local', 'plugin-a@mkt', true);

    const localPath = path.join(projectDir, 'config.local.json');
    const raw = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    expect(raw.enabledPlugins?.['plugin-a@mkt']).toBe(true);
  });
});
