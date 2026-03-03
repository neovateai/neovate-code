import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PluginLoader } from './loader';
import type { InstalledPlugin } from './types';
import { getPluginDirName } from './pluginDirResolver';

function createInstalledPlugin(
  installPath: string,
  name = 'test-plugin',
): InstalledPlugin {
  return {
    name,
    source: { type: 'local' as const, path: installPath },
    scope: 'global' as const,
    installPath,
    installedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('PluginLoader', () => {
  let tempDir: string;
  let loader: PluginLoader;

  const PRODUCT_NAME = 'neovate';
  const PLUGIN_DIR = getPluginDirName(PRODUCT_NAME);

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `loader-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    loader = new PluginLoader(PRODUCT_NAME);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('loads minimal manifest (name only)', async () => {
    const pluginDir = path.join(tempDir, 'minimal');
    fs.mkdirSync(path.join(pluginDir, PLUGIN_DIR), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, PLUGIN_DIR, 'plugin.json'),
      JSON.stringify({ name: 'minimal' }),
    );

    const plugin = await loader.loadInstalled(
      createInstalledPlugin(pluginDir, 'minimal'),
    );
    expect(plugin.name).toBe('minimal');
  });

  test('loads manifest with explicit skill paths', async () => {
    const pluginDir = path.join(tempDir, 'with-skills');
    fs.mkdirSync(path.join(pluginDir, PLUGIN_DIR), { recursive: true });
    fs.mkdirSync(path.join(pluginDir, 'custom-skills'), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, 'custom-skills', 'SKILL.md'),
      '# Test Skill',
    );
    fs.writeFileSync(
      path.join(pluginDir, PLUGIN_DIR, 'plugin.json'),
      JSON.stringify({
        name: 'with-skills',
        skills: ['./custom-skills/SKILL.md'],
      }),
    );

    const plugin = await loader.loadInstalled(
      createInstalledPlugin(pluginDir, 'with-skills'),
    );
    expect(plugin.skill).toBeDefined();

    const skills = await plugin.skill!.call({} as any);
    expect(skills).toHaveLength(1);
    expect(skills[0]).toContain('SKILL.md');
  });

  test('loads manifest with outputStyles', async () => {
    const pluginDir = path.join(tempDir, 'with-styles');
    fs.mkdirSync(path.join(pluginDir, PLUGIN_DIR), { recursive: true });
    fs.mkdirSync(path.join(pluginDir, 'styles'), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, 'styles', 'custom.md'),
      '# Custom Style\nBe concise.',
    );
    fs.writeFileSync(
      path.join(pluginDir, PLUGIN_DIR, 'plugin.json'),
      JSON.stringify({
        name: 'with-styles',
        outputStyles: ['./styles/custom.md'],
      }),
    );

    const plugin = await loader.loadInstalled(
      createInstalledPlugin(pluginDir, 'with-styles'),
    );
    expect(plugin.outputStyle).toBeDefined();

    const styles = await plugin.outputStyle!.call({} as any);
    expect(styles).toHaveLength(1);
    expect(styles[0].name).toBe('custom');
    expect(styles[0].prompt).toContain('Custom Style');
  });

  test('loads manifest with mcpServers via config hook', async () => {
    const pluginDir = path.join(tempDir, 'with-mcp');
    fs.mkdirSync(path.join(pluginDir, PLUGIN_DIR), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, PLUGIN_DIR, 'plugin.json'),
      JSON.stringify({
        name: 'with-mcp',
        mcpServers: {
          github: { type: 'stdio', command: 'npx', args: ['-y', 'foo'] },
        },
      }),
    );

    const plugin = await loader.loadInstalled(
      createInstalledPlugin(pluginDir, 'with-mcp'),
    );
    expect(plugin.config).toBeDefined();

    const config = await plugin.config!.call({} as any, {
      config: {} as any,
      argvConfig: {},
    });
    expect(config.mcpServers).toBeDefined();
    expect(config.mcpServers!.github).toBeDefined();
  });

  test('throws if plugin.json missing', async () => {
    const pluginDir = path.join(tempDir, 'no-manifest');
    fs.mkdirSync(pluginDir, { recursive: true });

    await expect(
      loader.loadInstalled(createInstalledPlugin(pluginDir, 'no-manifest')),
    ).rejects.toThrow('Plugin manifest not found');
  });

  test('auto-discovers commands from default commands/ directory', async () => {
    const pluginDir = path.join(tempDir, 'auto-commands');
    fs.mkdirSync(path.join(pluginDir, PLUGIN_DIR), { recursive: true });
    fs.mkdirSync(path.join(pluginDir, 'commands'), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, PLUGIN_DIR, 'plugin.json'),
      JSON.stringify({ name: 'auto-commands' }),
    );
    fs.writeFileSync(
      path.join(pluginDir, 'commands', 'review.md'),
      '---\ndescription: Review code\n---\nReview the code carefully.',
    );

    const plugin = await loader.loadInstalled(
      createInstalledPlugin(pluginDir, 'auto-commands'),
    );
    expect(plugin.slashCommand).toBeDefined();

    const cmds = await plugin.slashCommand!.call({} as any);
    expect(cmds).toHaveLength(1);
    expect(cmds[0].name).toBe('review');
    expect(cmds[0].type).toBe('prompt');
  });

  test('auto-discovers skills from default skills/ directory', async () => {
    const pluginDir = path.join(tempDir, 'auto-skills');
    fs.mkdirSync(path.join(pluginDir, PLUGIN_DIR), { recursive: true });
    fs.mkdirSync(path.join(pluginDir, 'skills', 'api-testing'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(pluginDir, PLUGIN_DIR, 'plugin.json'),
      JSON.stringify({ name: 'auto-skills' }),
    );
    fs.writeFileSync(
      path.join(pluginDir, 'skills', 'api-testing', 'SKILL.md'),
      '# API Testing Skill',
    );

    const plugin = await loader.loadInstalled(
      createInstalledPlugin(pluginDir, 'auto-skills'),
    );
    expect(plugin.skill).toBeDefined();

    const skills = await plugin.skill!.call({} as any);
    expect(skills).toHaveLength(1);
    expect(skills[0]).toContain('SKILL.md');
  });

  test('auto-discovers mcpServers from .mcp.json', async () => {
    const pluginDir = path.join(tempDir, 'auto-mcp');
    fs.mkdirSync(path.join(pluginDir, PLUGIN_DIR), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, PLUGIN_DIR, 'plugin.json'),
      JSON.stringify({ name: 'auto-mcp' }),
    );
    fs.writeFileSync(
      path.join(pluginDir, '.mcp.json'),
      JSON.stringify({
        mcpServers: {
          github: { command: 'npx', args: ['-y', 'foo'] },
        },
      }),
    );

    const plugin = await loader.loadInstalled(
      createInstalledPlugin(pluginDir, 'auto-mcp'),
    );
    expect(plugin.config).toBeDefined();

    const config = await plugin.config!.call({} as any, {
      config: {} as any,
      argvConfig: {},
    });
    expect(config.mcpServers?.github).toBeDefined();
  });

  test('manifest custom paths supplement default directories', async () => {
    const pluginDir = path.join(tempDir, 'merge-commands');
    fs.mkdirSync(path.join(pluginDir, PLUGIN_DIR), { recursive: true });
    fs.mkdirSync(path.join(pluginDir, 'commands'), { recursive: true });
    fs.mkdirSync(path.join(pluginDir, 'admin-commands'), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, PLUGIN_DIR, 'plugin.json'),
      JSON.stringify({
        name: 'merge-commands',
        commands: './admin-commands',
      }),
    );
    fs.writeFileSync(
      path.join(pluginDir, 'commands', 'review.md'),
      '---\ndescription: Review code\n---\nReview.',
    );
    fs.writeFileSync(
      path.join(pluginDir, 'admin-commands', 'admin.md'),
      '---\ndescription: Admin command\n---\nAdmin.',
    );

    const plugin = await loader.loadInstalled(
      createInstalledPlugin(pluginDir, 'merge-commands'),
    );
    const cmds = await plugin.slashCommand!.call({} as any);
    expect(cmds).toHaveLength(2);
    const names = cmds.map((c: any) => c.name).sort();
    expect(names).toEqual(['admin', 'review']);
  });

  test('replaces ${PLUGIN_ROOT} in mcpServers', async () => {
    const pluginDir = path.join(tempDir, 'plugin-root-var');
    fs.mkdirSync(path.join(pluginDir, PLUGIN_DIR), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, PLUGIN_DIR, 'plugin.json'),
      JSON.stringify({
        name: 'plugin-root-var',
        mcpServers: {
          tool: {
            command: 'node',
            args: ['${PLUGIN_ROOT}/server.js'],
          },
        },
      }),
    );

    const plugin = await loader.loadInstalled(
      createInstalledPlugin(pluginDir, 'plugin-root-var'),
    );
    const config = await plugin.config!.call({} as any, {
      config: {} as any,
      argvConfig: {},
    });
    expect((config.mcpServers?.tool as any).args[0]).toBe(
      path.join(pluginDir, 'server.js'),
    );
  });

  test('replaces legacy ${CLAUDE_PLUGIN_ROOT} in mcpServers', async () => {
    const pluginDir = path.join(tempDir, 'legacy-root-var');
    fs.mkdirSync(path.join(pluginDir, PLUGIN_DIR), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, PLUGIN_DIR, 'plugin.json'),
      JSON.stringify({
        name: 'legacy-root-var',
        mcpServers: {
          tool: {
            command: 'node',
            args: ['${CLAUDE_PLUGIN_ROOT}/server.js'],
          },
        },
      }),
    );

    const plugin = await loader.loadInstalled(
      createInstalledPlugin(pluginDir, 'legacy-root-var'),
    );
    const config = await plugin.config!.call({} as any, {
      config: {} as any,
      argvConfig: {},
    });
    expect((config.mcpServers?.tool as any).args[0]).toBe(
      path.join(pluginDir, 'server.js'),
    );
  });

  test('falls back to .claude-plugin when product-specific dir is absent', async () => {
    const pluginDir = path.join(tempDir, 'compat-fallback');
    fs.mkdirSync(path.join(pluginDir, '.claude-plugin'), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ name: 'compat-fallback' }),
    );

    const plugin = await loader.loadInstalled(
      createInstalledPlugin(pluginDir, 'compat-fallback'),
    );
    expect(plugin.name).toBe('compat-fallback');
  });

  test('prefers product-specific dir over .claude-plugin', async () => {
    const pluginDir = path.join(tempDir, 'prefer-product');
    fs.mkdirSync(path.join(pluginDir, PLUGIN_DIR), { recursive: true });
    fs.mkdirSync(path.join(pluginDir, '.claude-plugin'), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, PLUGIN_DIR, 'plugin.json'),
      JSON.stringify({ name: 'from-product-dir' }),
    );
    fs.writeFileSync(
      path.join(pluginDir, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ name: 'from-claude-dir' }),
    );

    const plugin = await loader.loadInstalled(
      createInstalledPlugin(pluginDir, 'prefer-product'),
    );
    expect(plugin.name).toBe('from-product-dir');
  });
});
