import { describe, expect, test } from 'vitest';
import {
  InstalledPluginSchema,
  PluginManifestSchema,
  PluginRegistryFileSchema,
  PluginSourceSchema,
} from './types';

describe('PluginSourceSchema', () => {
  test('valid local source', () => {
    const result = PluginSourceSchema.safeParse({
      type: 'local',
      path: './my-plugin',
    });
    expect(result.success).toBe(true);
  });

  test('valid git source', () => {
    const result = PluginSourceSchema.safeParse({
      type: 'git',
      url: 'https://github.com/foo/bar.git',
      ref: 'main',
    });
    expect(result.success).toBe(true);
  });

  test('valid github source', () => {
    const result = PluginSourceSchema.safeParse({
      type: 'github',
      repo: 'owner/repo',
    });
    expect(result.success).toBe(true);
  });

  test('invalid github repo format', () => {
    const result = PluginSourceSchema.safeParse({
      type: 'github',
      repo: 'invalid-no-slash',
    });
    expect(result.success).toBe(false);
  });

  test('valid npm source', () => {
    const result = PluginSourceSchema.safeParse({
      type: 'npm',
      package: 'my-plugin',
      version: '1.0.0',
    });
    expect(result.success).toBe(true);
  });

  test('invalid source type', () => {
    const result = PluginSourceSchema.safeParse({
      type: 'unknown',
      path: 'foo',
    });
    expect(result.success).toBe(false);
  });
});

describe('PluginManifestSchema', () => {
  test('minimal valid manifest', () => {
    const result = PluginManifestSchema.safeParse({
      name: 'my-plugin',
    });
    expect(result.success).toBe(true);
  });

  test('full manifest', () => {
    const result = PluginManifestSchema.safeParse({
      name: 'code-review',
      version: '1.0.0',
      description: 'A review plugin',
      author: { name: 'Test', email: 'test@test.com' },
      main: './dist/index.js',
      skills: ['./skills/SKILL.md'],
      commands: ['./commands/review.ts'],
      agents: ['./agents/reviewer.md'],
      outputStyles: ['./styles/review.md'],
      mcpServers: {
        github: { type: 'stdio', command: 'npx', args: ['-y', 'foo'] },
      },
    });
    expect(result.success).toBe(true);
  });

  test('name must be kebab-case', () => {
    const result = PluginManifestSchema.safeParse({
      name: 'My Plugin',
    });
    expect(result.success).toBe(false);
  });

  test('name cannot be empty', () => {
    const result = PluginManifestSchema.safeParse({
      name: '',
    });
    expect(result.success).toBe(false);
  });

  test('author can be string', () => {
    const result = PluginManifestSchema.safeParse({
      name: 'test',
      author: 'John Doe',
    });
    expect(result.success).toBe(true);
  });
});

describe('InstalledPluginSchema', () => {
  test('valid installed plugin', () => {
    const result = InstalledPluginSchema.safeParse({
      name: 'my-plugin',
      source: { type: 'local', path: './my-plugin' },
      scope: 'global',
      installPath: '/home/user/.neovate/installed/my-plugin',
      installedAt: '2026-01-01T00:00:00.000Z',
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  test('enabled defaults to true', () => {
    const result = InstalledPluginSchema.parse({
      name: 'my-plugin',
      source: { type: 'local', path: './foo' },
      scope: 'global',
      installPath: '/tmp/foo',
      installedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.enabled).toBe(true);
  });

  test('invalid scope', () => {
    const result = InstalledPluginSchema.safeParse({
      name: 'my-plugin',
      source: { type: 'local', path: './foo' },
      scope: 'invalid',
      installPath: '/tmp/foo',
      installedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('PluginRegistryFileSchema', () => {
  test('valid registry file', () => {
    const result = PluginRegistryFileSchema.safeParse({
      version: 1,
      plugins: {
        'my-plugin': {
          name: 'my-plugin',
          source: { type: 'local', path: './foo' },
          scope: 'global',
          installPath: '/tmp/foo',
          installedAt: '2026-01-01T00:00:00.000Z',
          enabled: true,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  test('empty plugins', () => {
    const result = PluginRegistryFileSchema.safeParse({
      version: 1,
      plugins: {},
    });
    expect(result.success).toBe(true);
  });

  test('wrong version', () => {
    const result = PluginRegistryFileSchema.safeParse({
      version: 2,
      plugins: {},
    });
    expect(result.success).toBe(false);
  });
});
