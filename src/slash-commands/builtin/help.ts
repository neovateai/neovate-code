import { LocalCommand } from '../types';

export const helpCommand: LocalCommand = {
  type: 'local',
  name: 'help',
  description: 'Show available slash commands',
  async call(args: string, context) {
    const commands = context.slashCommands.getAll();
    if (commands.length === 0) {
      return 'No commands available.';
    }

    // Categorize commands
    const builtinCommands = commands.filter(
      (cmd) =>
        !cmd.name.includes(':') &&
        ['clear', 'help', 'read-file', 'test'].includes(cmd.name),
    );

    const userCommands = commands.filter((cmd) => cmd.name.startsWith('user:'));
    const projectCommands = commands.filter((cmd) =>
      cmd.name.startsWith('project:'),
    );
    const pluginCommands = commands.filter(
      (cmd) =>
        !cmd.name.includes(':') &&
        !['clear', 'help', 'read-file', 'test'].includes(cmd.name),
    );

    let result = 'Available slash commands:\n\n';

    // Built-in commands
    if (builtinCommands.length > 0) {
      result += '📦 Built-in Commands:\n';
      builtinCommands.forEach((cmd) => {
        result += `  /${cmd.name} - ${cmd.description}\n`;
      });
      result += '\n';
    }

    // User commands
    if (userCommands.length > 0) {
      result += '👤 User Commands (from ~/.takumi/commands/):\n';
      userCommands.forEach((cmd) => {
        result += `  /${cmd.name} - ${cmd.description}\n`;
      });
      result += '\n';
    }

    // Project commands
    if (projectCommands.length > 0) {
      result += '📁 Project Commands (from .takumi/commands/):\n';
      projectCommands.forEach((cmd) => {
        result += `  /${cmd.name} - ${cmd.description}\n`;
      });
      result += '\n';
    }

    // Plugin commands
    if (pluginCommands.length > 0) {
      result += '🔌 Plugin Commands:\n';
      pluginCommands.forEach((cmd) => {
        result += `  /${cmd.name} - ${cmd.description}\n`;
      });
      result += '\n';
    }

    result += `Total: ${commands.length} commands available`;
    return result.trim();
  },
};
