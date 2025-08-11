import { Context } from '../context';
import { PluginHookType } from '../plugin';
import { createBuiltinCommands } from './builtin';
import { loadGlobalCommands, loadProjectCommands } from './filesystem-loader';
import { SlashCommandRegistryImpl } from './registry';
import { type SlashCommand, type SlashCommandRegistry } from './types';

export * from './types';
export * from './registry';
export * from './builtin';
export * from './filesystem-loader';

export async function createSlashCommandRegistry(
  context: Context,
): Promise<SlashCommandRegistry> {
  const registry = new SlashCommandRegistryImpl();
  const builtinCommands = createBuiltinCommands({ context });

  // Register built-in commands
  builtinCommands.forEach((command) => {
    registry.register(command);
  });

  // Register filesystem commands
  try {
    // Load global commands from ~/.takumi/commands
    const globalCommands = loadGlobalCommands(context.paths.globalConfigDir);
    globalCommands.forEach((command) => {
      registry.register(command);
    });

    // Load project commands from {cwd}/.takumi/commands
    const projectCommands = loadProjectCommands(context.paths.projectConfigDir);
    projectCommands.forEach((command) => {
      registry.register(command);
    });
  } catch (e) {
    console.warn('Warning: Could not load filesystem commands:', e);
  }

  try {
    // Register commands from plugins
    const pluginCommands = await context.apply({
      hook: 'command',
      args: [],
      memo: [] as SlashCommand[],
      type: PluginHookType.SeriesMerge,
    });

    if (Array.isArray(pluginCommands)) {
      pluginCommands.forEach((command) => {
        registry.register(command);
      });
    }
  } catch (e) {
    // Plugins may not have slash commands, that's fine
  }

  return registry;
}
