import { SlashCommand, SlashCommandRegistry } from './types';

export class SlashCommandRegistryImpl implements SlashCommandRegistry {
  private commands: Map<string, SlashCommand> = new Map();

  register(command: SlashCommand): void {
    this.commands.set(command.name, command);
  }

  unregister(name: string): void {
    this.commands.delete(name);
  }

  get(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  getAll(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  hasCommand(name: string): boolean {
    return this.commands.has(name);
  }

  getMatchingCommands(prefix: string): SlashCommand[] {
    const lowerPrefix = prefix.toLowerCase();
    return Array.from(this.commands.values()).filter((command) => {
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
