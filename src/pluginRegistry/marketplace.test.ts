import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { MarketplaceManager } from './marketplace';
import { getPluginDirName } from './pluginDirResolver';

describe('MarketplaceManager', () => {
  let tempDir: string;
  let manager: MarketplaceManager;

  const PRODUCT_NAME = 'neovate';
  const PLUGIN_DIR = getPluginDirName(PRODUCT_NAME);

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `marketplace-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    manager = new MarketplaceManager({
      pluginsDir: tempDir,
      productName: PRODUCT_NAME,
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('returns empty known marketplaces when file does not exist', () => {
    expect(manager.getKnownMarketplaces()).toEqual({});
  });

  test('add and get marketplace', () => {
    manager.addMarketplace(
      'test-market',
      { source: 'git', url: 'https://github.com/user/repo.git' },
      '/tmp/marketplaces/test-market',
    );
    const known = manager.getKnownMarketplaces();
    expect(known['test-market']).toBeDefined();
    expect(known['test-market'].source).toEqual({
      source: 'git',
      url: 'https://github.com/user/repo.git',
    });
    expect(known['test-market'].installLocation).toBe(
      '/tmp/marketplaces/test-market',
    );
  });

  test('remove marketplace', () => {
    manager.addMarketplace(
      'test-market',
      { source: 'git', url: 'https://github.com/user/repo.git' },
      '/tmp/test',
    );
    manager.removeMarketplace('test-market');
    expect(manager.getKnownMarketplaces()).toEqual({});
  });

  test('persists to disk', () => {
    manager.addMarketplace(
      'test-market',
      { source: 'git', url: 'https://github.com/user/repo.git' },
      '/tmp/test',
    );
    const manager2 = new MarketplaceManager({
      pluginsDir: tempDir,
      productName: PRODUCT_NAME,
    });
    expect(manager2.getKnownMarketplaces()['test-market']).toBeDefined();
  });

  test('readMarketplaceJson returns null for missing dir', () => {
    expect(manager.readMarketplaceJson('/nonexistent')).toBeNull();
  });

  test('readMarketplaceJson reads product-specific plugin dir', () => {
    const mktDir = path.join(tempDir, 'test-market');
    const pluginDir = path.join(mktDir, PLUGIN_DIR);
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, 'marketplace.json'),
      JSON.stringify({
        name: 'test-market',
        plugins: [
          { name: 'plugin-a', description: 'A plugin', source: './plugins/a' },
        ],
      }),
      'utf-8',
    );
    const result = manager.readMarketplaceJson(mktDir);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('test-market');
    expect(result!.plugins).toHaveLength(1);
  });

  test('readMarketplaceJson falls back to .claude-plugin', () => {
    const mktDir = path.join(tempDir, 'test-market-compat');
    const pluginDir = path.join(mktDir, '.claude-plugin');
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, 'marketplace.json'),
      JSON.stringify({
        name: 'test-market-compat',
        plugins: [
          { name: 'plugin-b', description: 'B plugin', source: './plugins/b' },
        ],
      }),
      'utf-8',
    );
    const result = manager.readMarketplaceJson(mktDir);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('test-market-compat');
  });

  test('readMarketplaceJson prefers product-specific dir over .claude-plugin', () => {
    const mktDir = path.join(tempDir, 'test-market-prefer');
    fs.mkdirSync(path.join(mktDir, PLUGIN_DIR), { recursive: true });
    fs.mkdirSync(path.join(mktDir, '.claude-plugin'), { recursive: true });
    fs.writeFileSync(
      path.join(mktDir, PLUGIN_DIR, 'marketplace.json'),
      JSON.stringify({
        name: 'from-product',
        plugins: [],
      }),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(mktDir, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({
        name: 'from-claude',
        plugins: [],
      }),
      'utf-8',
    );
    const result = manager.readMarketplaceJson(mktDir);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('from-product');
  });

  test('getInstallCounts returns empty map when no cache', () => {
    expect(manager.getInstallCounts().size).toBe(0);
  });

  test('getInstallCounts reads cache file', () => {
    fs.writeFileSync(
      manager.installCountsCachePath,
      JSON.stringify({
        version: 1,
        fetchedAt: '2026-01-01T00:00:00.000Z',
        counts: [
          { plugin: 'plugin-a@test-market', unique_installs: 1000 },
          { plugin: 'plugin-b@test-market', unique_installs: 500 },
        ],
      }),
      'utf-8',
    );
    const counts = manager.getInstallCounts();
    expect(counts.get('plugin-a@test-market')).toBe(1000);
    expect(counts.get('plugin-b@test-market')).toBe(500);
  });

  test('handles corrupted known_marketplaces.json', () => {
    fs.writeFileSync(manager.knownMarketplacesPath, 'bad-json', 'utf-8');
    expect(manager.getKnownMarketplaces()).toEqual({});
  });
});
