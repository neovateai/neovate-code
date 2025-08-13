import { describe, expect, it } from 'vitest';
import {
  SlashCommandRegistryImpl,
  isSlashCommand,
  parseSlashCommand,
} from './registry';
import { CommandSource, type LocalCommand } from './types';

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

  it('should implement priority-based command resolution', () => {
    const registry = new SlashCommandRegistryImpl();

    const builtinCommand: LocalCommand = {
      type: 'local',
      name: 'test',
      description: 'Builtin test command',
      async call() {
        return 'builtin';
      },
    };

    const userCommand: LocalCommand = {
      type: 'local',
      name: 'test',
      description: 'User test command',
      async call() {
        return 'user';
      },
    };

    const projectCommand: LocalCommand = {
      type: 'local',
      name: 'test',
      description: 'Project test command',
      async call() {
        return 'project';
      },
    };

    // Register builtin first
    registry.register(builtinCommand, CommandSource.Builtin);
    expect(registry.get('test')?.description).toBe('Builtin test command');

    // Register user - should override builtin
    registry.register(userCommand, CommandSource.User);
    expect(registry.get('test')?.description).toBe('User test command');

    // Register project - should override user
    registry.register(projectCommand, CommandSource.Project);
    expect(registry.get('test')?.description).toBe('Project test command');

    // Registering builtin again should not override project
    registry.register(builtinCommand, CommandSource.Builtin);
    expect(registry.get('test')?.description).toBe('Project test command');
  });

  it('should allow same priority commands to override each other', () => {
    const registry = new SlashCommandRegistryImpl();

    const pluginCommand1: LocalCommand = {
      type: 'local',
      name: 'test',
      description: 'Plugin command 1',
      async call() {
        return 'plugin1';
      },
    };

    const pluginCommand2: LocalCommand = {
      type: 'local',
      name: 'test',
      description: 'Plugin command 2',
      async call() {
        return 'plugin2';
      },
    };

    registry.register(pluginCommand1, CommandSource.Plugin);
    expect(registry.get('test')?.description).toBe('Plugin command 1');

    registry.register(pluginCommand2, CommandSource.Plugin);
    expect(registry.get('test')?.description).toBe('Plugin command 2');
  });

  it('should categorize commands by source', () => {
    const registry = new SlashCommandRegistryImpl();

    const builtinCmd: LocalCommand = {
      type: 'local',
      name: 'builtin',
      description: 'Builtin command',
      async call() {
        return 'builtin';
      },
    };

    const userCmd: LocalCommand = {
      type: 'local',
      name: 'user',
      description: 'User command',
      async call() {
        return 'user';
      },
    };

    const projectCmd: LocalCommand = {
      type: 'local',
      name: 'project',
      description: 'Project command',
      async call() {
        return 'project';
      },
    };

    registry.register(builtinCmd, CommandSource.Builtin);
    registry.register(userCmd, CommandSource.User);
    registry.register(projectCmd, CommandSource.Project);

    const builtinCommands = registry.getCommandsBySource(CommandSource.Builtin);
    const userCommands = registry.getCommandsBySource(CommandSource.User);
    const projectCommands = registry.getCommandsBySource(CommandSource.Project);

    expect(builtinCommands).toHaveLength(1);
    expect(builtinCommands[0].name).toBe('builtin');

    expect(userCommands).toHaveLength(1);
    expect(userCommands[0].name).toBe('user');

    expect(projectCommands).toHaveLength(1);
    expect(projectCommands[0].name).toBe('project');
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

  it('should return null for file paths', () => {
    expect(parseSlashCommand('/home/user/file.txt')).toBeNull();
    expect(parseSlashCommand('/usr/bin/node')).toBeNull();
    expect(parseSlashCommand('/path/to/directory/')).toBeNull();
    expect(parseSlashCommand('/src/components/App.tsx')).toBeNull();
    expect(parseSlashCommand('/etc/hosts')).toBeNull();
  });

  it('should still parse valid slash commands', () => {
    expect(parseSlashCommand('/clear')).toEqual({ command: 'clear', args: '' });
    expect(parseSlashCommand('/exit')).toEqual({ command: 'exit', args: '' });
    expect(parseSlashCommand('/help something')).toEqual({
      command: 'help',
      args: 'something',
    });
  });
});

describe('isSlashCommand', () => {
  it('should identify slash commands', () => {
    expect(isSlashCommand('/help')).toBe(true);
    expect(isSlashCommand('  /help  ')).toBe(true);
    expect(isSlashCommand('/clear')).toBe(true);
    expect(isSlashCommand('/exit')).toBe(true);
  });

  it('should identify non-slash commands', () => {
    expect(isSlashCommand('help')).toBe(false);
    expect(isSlashCommand('regular text')).toBe(false);
    expect(isSlashCommand('')).toBe(false);
  });

  it('should not identify file paths as slash commands', () => {
    expect(isSlashCommand('/home/user/file.txt')).toBe(false);
    expect(isSlashCommand('/usr/bin/node')).toBe(false);
    expect(isSlashCommand('/path/to/directory/')).toBe(false);
    expect(isSlashCommand('/src/components/App.tsx')).toBe(false);
    expect(isSlashCommand('/etc/hosts')).toBe(false);
  });
});
