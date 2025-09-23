import type { Context } from '../context';

export enum CommandSource {
  Builtin = 'builtin',
  User = 'user',
  Project = 'project',
  Plugin = 'plugin',
}

export interface BaseSlashCommand {
  name: string;
  description: string;
  isEnabled?: boolean;
}

export interface LocalCommand extends BaseSlashCommand {
  type: 'local';
  call(args: string, context: Context): Promise<string>;
}

export interface LocalJSXCommand extends BaseSlashCommand {
  type: 'local-jsx';
  call(
    onDone: (result: string | null) => void,
    context: Context,
  ): Promise<React.ReactNode>;
}

export interface PromptCommand extends BaseSlashCommand {
  type: 'prompt';
  argNames?: string[];
  progressMessage: string;
  model?: string;
  getPromptForCommand(
    args: string,
  ): Promise<Array<{ role: string; content: string }>>;
}

export type SlashCommand = LocalCommand | LocalJSXCommand | PromptCommand;

export interface SlashCommandRegistry {
  register(command: SlashCommand, source?: CommandSource): void;
  unregister(name: string): void;
  get(name: string): SlashCommand | undefined;
  getAll(): SlashCommand[];
  getCommandsBySource(source: CommandSource): SlashCommand[];
  hasCommand(name: string): boolean;
  getMatchingCommands(prefix: string): SlashCommand[];
}

export interface SlashCommandResult {
  type: 'text' | 'jsx';
  content: string | React.ReactNode;
  command: string;
  args: string;
}
