import { SlashCommandManager } from '../../slashCommand';
import { CommandSource, type LocalCommand } from '../types';

export const helpCommand: LocalCommand = {
  type: 'local',
  name: 'help',
  description: 'Show available slash commands',
  async call(_args: string, context) {
    const slashCommandManager = await SlashCommandManager.create(
      context as any,
    );
    const commands = slashCommandManager.getAll();
    if (commands.length === 0) {
      return 'No commands available.';
    }

    // Categorize commands by source
    const builtinCommands = slashCommandManager.getCommandsBySource(
      CommandSource.Builtin,
    );
    const userCommands = slashCommandManager.getCommandsBySource(
      CommandSource.User,
    );
    const projectCommands = slashCommandManager.getCommandsBySource(
      CommandSource.Project,
    );
    const pluginCommands = slashCommandManager.getCommandsBySource(
      CommandSource.Plugin,
    );

    let result = 'Available slash commands:\n\n';

    // Built-in commands
    if (builtinCommands.length > 0) {
      result += '📦 Built-in Commands:\n';
      builtinCommands.forEach((cmd) => {
        result += `  /${cmd.command.name} - ${cmd.command.description}\n`;
      });
      result += '\n';
    }

    // User commands
    if (userCommands.length > 0) {
      result += '👤 User Commands:\n';
      userCommands.forEach((cmd) => {
        result += `  /${cmd.command.name} - ${cmd.command.description}\n`;
      });
      result += '\n';
    }

    // Project commands
    if (projectCommands.length > 0) {
      result += '📁 Project Commands:\n';
      projectCommands.forEach((cmd) => {
        result += `  /${cmd.command.name} - ${cmd.command.description}\n`;
      });
      result += '\n';
    }

    // Plugin commands
    if (pluginCommands.length > 0) {
      result += '🔌 Plugin Commands:\n';
      pluginCommands.forEach((cmd) => {
        result += `  /${cmd.command.name} - ${cmd.command.description}\n`;
      });
      result += '\n';
    }

    result += `Total: ${commands.length} commands available`;
    return result.trim();
  },
};
