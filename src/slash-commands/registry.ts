import {
  CommandSource,
  type SlashCommand,
  type SlashCommandRegistry,
} from './types';

interface CommandEntry {
  command: SlashCommand;
  source: CommandSource;
}

export class SlashCommandRegistryImpl implements SlashCommandRegistry {
  private commands: Map<string, CommandEntry> = new Map();

  // Priority order: project > user > plugin > builtin (higher number = higher priority)
  private getPriority(source: CommandSource): number {
    switch (source) {
      case CommandSource.Project:
        return 3;
      case CommandSource.User:
        return 2;
      case CommandSource.Plugin:
        return 1;
      case CommandSource.Builtin:
        return 0;
      default:
        return 0;
    }
  }

  register(
    command: SlashCommand,
    source: CommandSource = CommandSource.Plugin,
  ): void {
    const existingEntry = this.commands.get(command.name);
    const newPriority = this.getPriority(source);

    if (existingEntry && this.getPriority(existingEntry.source) < newPriority) {
      console.debug(
        `Command '${command.name}' overridden by ${source} source (was ${existingEntry.source})`,
      );
    }

    // Only register if this command has higher priority or doesn't exist
    if (
      !existingEntry ||
      this.getPriority(existingEntry.source) <= newPriority
    ) {
      this.commands.set(command.name, { command, source });
    }
  }

  unregister(name: string): void {
    this.commands.delete(name);
  }

  get(name: string): SlashCommand | undefined {
    const entry = this.commands.get(name);
    return entry?.command;
  }

  getAll(): SlashCommand[] {
    return Array.from(this.commands.values()).map((entry) => entry.command);
  }

  getCommandsBySource(source: CommandSource): SlashCommand[] {
    return Array.from(this.commands.values())
      .filter((entry) => entry.source === source)
      .map((entry) => entry.command);
  }

  hasCommand(name: string): boolean {
    return this.commands.has(name);
  }

  getMatchingCommands(prefix: string): SlashCommand[] {
    const lowerPrefix = prefix.toLowerCase();
    return Array.from(this.commands.values())
      .map((entry) => entry.command)
      .filter((command) => {
        const nameMatch = command.name.toLowerCase().startsWith(lowerPrefix);
        const descriptionMatch = command.description
          .toLowerCase()
          .includes(lowerPrefix);
        return nameMatch || descriptionMatch;
      });
  }
}

function isFilePath(input: string): boolean {
  const trimmed = input.trim();
  // If the string starts with '/' and contains another '/', we consider it a file path.
  // This reliably identifies paths like '/path/to/file' while avoiding
  // misclassifying single-segment commands like '/help' or '/agent.run'.
  return trimmed.startsWith('/') && trimmed.indexOf('/', 1) !== -1;
}

export function parseSlashCommand(
  input: string,
): { command: string; args: string } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }

  // Check if it's a file path rather than a slash command
  if (isFilePath(trimmed)) {
    return null;
  }

  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return {
      command: trimmed.slice(1),
      args: '',
    };
  }

  return {
    command: trimmed.slice(1, spaceIndex),
    args: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export function isSlashCommand(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith('/') && !isFilePath(trimmed);
}
