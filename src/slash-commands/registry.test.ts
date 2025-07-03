import { describe, expect, it } from 'vitest';
import {
  SlashCommandRegistryImpl,
  isSlashCommand,
  parseSlashCommand,
} from './registry';
import { LocalCommand } from './types';

describe('SlashCommandRegistry', () => {
  it('should register and retrieve commands', () => {
    const registry = new SlashCommandRegistryImpl();
    const testCommand: LocalCommand = {
      type: 'local',
      name: 'test',
      description: 'Test command',
      async call() {
        return 'test result';
      },
    };

    registry.register(testCommand);

    expect(registry.hasCommand('test')).toBe(true);
    expect(registry.get('test')).toBe(testCommand);
    expect(registry.getAll()).toContain(testCommand);
  });

  it('should unregister commands', () => {
    const registry = new SlashCommandRegistryImpl();
    const testCommand: LocalCommand = {
      type: 'local',
      name: 'test',
      description: 'Test command',
      async call() {
        return 'test result';
      },
    };

    registry.register(testCommand);
    registry.unregister('test');

    expect(registry.hasCommand('test')).toBe(false);
    expect(registry.get('test')).toBeUndefined();
  });
});

describe('parseSlashCommand', () => {
  it('should parse command without arguments', () => {
    const result = parseSlashCommand('/help');
    expect(result).toEqual({ command: 'help', args: '' });
  });

  it('should parse command with arguments', () => {
    const result = parseSlashCommand('/search pattern');
    expect(result).toEqual({ command: 'search', args: 'pattern' });
  });

  it('should return null for non-slash commands', () => {
    const result = parseSlashCommand('regular text');
    expect(result).toBeNull();
  });

  it('should handle whitespace', () => {
    const result = parseSlashCommand('  /help  ');
    expect(result).toEqual({ command: 'help', args: '' });
  });
});

describe('isSlashCommand', () => {
  it('should identify slash commands', () => {
    expect(isSlashCommand('/help')).toBe(true);
    expect(isSlashCommand('  /help  ')).toBe(true);
  });

  it('should identify non-slash commands', () => {
    expect(isSlashCommand('help')).toBe(false);
    expect(isSlashCommand('regular text')).toBe(false);
    expect(isSlashCommand('')).toBe(false);
  });
});
