import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { InstalledPlugin } from './types';
import { PluginRegistry } from './registry';

function createPlugin(
  overrides: Partial<InstalledPlugin> = {},
): InstalledPlugin {
  return {
    name: 'test-plugin',
    source: { type: 'local' as const, path: './test' },
    scope: 'global' as const,
    installPath: '/tmp/test-plugin',
    installedAt: '2026-01-01T00:00:00.000Z',
    enabled: true,
    ...overrides,
  };
}

describe('PluginRegistry', () => {
  let tempDir: string;
  let registryPath: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `registry-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    registryPath = path.join(tempDir, 'installed_plugins.json');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('empty registry when file does not exist', () => {
    const registry = new PluginRegistry({ registryPath });
    expect(registry.getAll()).toEqual({});
  });

  test('register and get plugin', () => {
    const registry = new PluginRegistry({ registryPath });
    const plugin = createPlugin();
    registry.register(plugin);

    expect(registry.get('test-plugin')).toEqual(plugin);
  });

  test('persists to disk', () => {
    const registry1 = new PluginRegistry({ registryPath });
    registry1.register(createPlugin());

    const registry2 = new PluginRegistry({ registryPath });
    expect(registry2.get('test-plugin')).toBeDefined();
    expect(registry2.get('test-plugin')!.name).toBe('test-plugin');
  });

  test('unregister removes plugin', () => {
    const registry = new PluginRegistry({ registryPath });
    registry.register(createPlugin());
    registry.unregister('test-plugin');

    expect(registry.get('test-plugin')).toBeUndefined();
  });

  test('getEnabled returns only enabled plugins', () => {
    const registry = new PluginRegistry({ registryPath });
    registry.register(createPlugin({ name: 'enabled-one' }));
    registry.register(createPlugin({ name: 'disabled-one', enabled: false }));

    const enabled = registry.getEnabled();
    expect(enabled).toHaveLength(1);
    expect(enabled[0].name).toBe('enabled-one');
  });

  test('setEnabled toggles plugin state', () => {
    const registry = new PluginRegistry({ registryPath });
    registry.register(createPlugin());
    registry.setEnabled('test-plugin', false);

    expect(registry.get('test-plugin')!.enabled).toBe(false);

    registry.setEnabled('test-plugin', true);
    expect(registry.get('test-plugin')!.enabled).toBe(true);
  });

  test('getByScope filters by scope', () => {
    const registry = new PluginRegistry({ registryPath });
    registry.register(createPlugin({ name: 'global-one', scope: 'global' }));
    registry.register(createPlugin({ name: 'project-one', scope: 'project' }));

    expect(registry.getByScope('global')).toHaveLength(1);
    expect(registry.getByScope('global')[0].name).toBe('global-one');
    expect(registry.getByScope('project')).toHaveLength(1);
    expect(registry.getByScope('project')[0].name).toBe('project-one');
  });

  test('updateEntry merges updates', () => {
    const registry = new PluginRegistry({ registryPath });
    registry.register(createPlugin());
    registry.updateEntry('test-plugin', { version: '2.0.0' });

    const plugin = registry.get('test-plugin')!;
    expect(plugin.version).toBe('2.0.0');
    expect(plugin.lastUpdated).toBeDefined();
  });

  test('handles corrupted file gracefully', () => {
    fs.writeFileSync(registryPath, 'not-json', 'utf-8');
    const registry = new PluginRegistry({ registryPath });
    expect(registry.getAll()).toEqual({});
  });
});
