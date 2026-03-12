import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PluginInstaller } from './installer';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

const mockedExecSync = vi.mocked(execSync);

describe('PluginInstaller', () => {
  let tempDir: string;
  let installer: PluginInstaller;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `installer-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    installer = new PluginInstaller({ pluginsRoot: tempDir });
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('install local', () => {
    test('creates symlink for local source', async () => {
      const sourceDir = path.join(tempDir, 'source-plugin');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(
        path.join(sourceDir, 'plugin.json'),
        JSON.stringify({ name: 'test-local' }),
        'utf-8',
      );

      const result = await installer.install({
        name: 'test-local',
        source: { type: 'local', path: sourceDir },
        scope: 'global',
      });

      expect(result.manifest.name).toBe('test-local');
      const installPath = path.join(tempDir, 'test-local');
      expect(fs.lstatSync(installPath).isSymbolicLink()).toBe(true);
    });

    test('throws if source path not found', async () => {
      await expect(
        installer.install({
          name: 'missing',
          source: { type: 'local', path: '/nonexistent/path' },
          scope: 'global',
        }),
      ).rejects.toThrow('Plugin path not found');
    });
  });

  describe('install git', () => {
    test('calls git clone with correct args', async () => {
      const installPath = path.join(tempDir, 'git-plugin');
      mockedExecSync.mockImplementation((cmd: any) => {
        if (typeof cmd === 'string' && cmd.startsWith('git clone')) {
          fs.mkdirSync(installPath, { recursive: true });
          fs.writeFileSync(
            path.join(installPath, 'plugin.json'),
            JSON.stringify({ name: 'git-plugin' }),
            'utf-8',
          );
        }
        return Buffer.from('');
      });

      const result = await installer.install({
        name: 'git-plugin',
        source: { type: 'git', url: 'https://github.com/foo/bar.git' },
        scope: 'global',
      });

      expect(result.manifest.name).toBe('git-plugin');
      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.stringContaining('git clone --depth 1'),
        expect.any(Object),
      );
    });

    test('passes ref as --branch', async () => {
      const installPath = path.join(tempDir, 'git-ref');
      mockedExecSync.mockImplementation((cmd: any) => {
        if (typeof cmd === 'string' && cmd.startsWith('git clone')) {
          fs.mkdirSync(installPath, { recursive: true });
          fs.writeFileSync(
            path.join(installPath, 'plugin.json'),
            JSON.stringify({ name: 'git-ref' }),
            'utf-8',
          );
        }
        return Buffer.from('');
      });

      await installer.install({
        name: 'git-ref',
        source: {
          type: 'git',
          url: 'https://github.com/foo/bar.git',
          ref: 'v1.0',
        },
        scope: 'global',
      });

      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--branch v1.0'),
        expect.any(Object),
      );
    });
  });

  describe('install github', () => {
    test('converts github source to git url', async () => {
      const installPath = path.join(tempDir, 'gh-plugin');
      mockedExecSync.mockImplementation((cmd: any) => {
        if (typeof cmd === 'string' && cmd.startsWith('git clone')) {
          fs.mkdirSync(installPath, { recursive: true });
          fs.writeFileSync(
            path.join(installPath, 'plugin.json'),
            JSON.stringify({ name: 'gh-plugin' }),
            'utf-8',
          );
        }
        return Buffer.from('');
      });

      await installer.install({
        name: 'gh-plugin',
        source: { type: 'github', repo: 'owner/repo' },
        scope: 'global',
      });

      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/owner/repo.git'),
        expect.any(Object),
      );
    });
  });

  describe('uninstall', () => {
    test('removes install directory', async () => {
      const pluginDir = path.join(tempDir, 'to-remove');
      fs.mkdirSync(pluginDir, { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'file.txt'), 'content');

      await installer.uninstall(pluginDir);
      expect(fs.existsSync(pluginDir)).toBe(false);
    });

    test('no error if path does not exist', async () => {
      await expect(
        installer.uninstall('/nonexistent/path'),
      ).resolves.not.toThrow();
    });
  });

  describe('update', () => {
    test('runs git pull for git source', async () => {
      const installPath = path.join(tempDir, 'update-plugin');
      fs.mkdirSync(installPath, { recursive: true });
      fs.writeFileSync(
        path.join(installPath, 'plugin.json'),
        JSON.stringify({ name: 'update-plugin' }),
        'utf-8',
      );
      mockedExecSync.mockReturnValue(Buffer.from(''));

      const result = await installer.update({
        name: 'update-plugin',
        source: { type: 'git', url: 'https://github.com/foo/bar.git' },
        installPath,
      });

      expect(result.manifest.name).toBe('update-plugin');
      expect(mockedExecSync).toHaveBeenCalledWith(
        'git pull',
        expect.any(Object),
      );
    });
  });

  describe('manifest validation', () => {
    test('throws if plugin.json is missing', async () => {
      const sourceDir = path.join(tempDir, 'no-manifest');
      fs.mkdirSync(sourceDir, { recursive: true });

      await expect(
        installer.install({
          name: 'no-manifest',
          source: { type: 'local', path: sourceDir },
          scope: 'global',
        }),
      ).rejects.toThrow('Missing plugin.json');
    });

    test('throws if plugin.json is invalid', async () => {
      const sourceDir = path.join(tempDir, 'bad-manifest');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(
        path.join(sourceDir, 'plugin.json'),
        JSON.stringify({ name: 'INVALID NAME' }),
        'utf-8',
      );

      await expect(
        installer.install({
          name: 'bad-manifest',
          source: { type: 'local', path: sourceDir },
          scope: 'global',
        }),
      ).rejects.toThrow();
    });
  });
});
