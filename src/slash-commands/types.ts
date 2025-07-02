import { Context } from '../context';

export interface BaseSlashCommand {
  name: string;
  description: string;
}

export interface LocalCommand extends BaseSlashCommand {
  type: 'local';
  call(args: string, context: Context): Promise<string>;
}

export interface LocalJSXCommand extends BaseSlashCommand {
  type: 'local-jsx';
  call(
    onDone: (result: string) => void,
    context: Context,
  ): Promise<React.ReactNode>;
}

export interface PromptCommand extends BaseSlashCommand {
  type: 'prompt';
  argNames?: string[];
  progressMessage: string;
  getPromptForCommand(
    args: string,
  ): Promise<Array<{ role: string; content: string }>>;
}

export type SlashCommand = LocalCommand | LocalJSXCommand | PromptCommand;

export interface SlashCommandRegistry {
  register(command: SlashCommand): void;
  unregister(name: string): void;
  get(name: string): SlashCommand | undefined;
  getAll(): SlashCommand[];
  hasCommand(name: string): boolean;
}

export interface SlashCommandResult {
  type: 'text' | 'jsx';
  content: string | React.ReactNode;
  command: string;
  args: string;
}
