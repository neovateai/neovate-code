import path from 'pathe';
import type { Context } from './context';
import {
  loadPolishedMarkdownFiles,
  type NormalizedMarkdownFile,
} from './outputStyle';
import type { Paths } from './paths';
import { PluginHookType } from './plugin';
import { createBuiltinCommands } from './slash-commands/builtin';
import {
  CommandSource,
  type PromptCommand,
  type SlashCommand,
} from './slash-commands/types';

export type SlashCommandManagerOpts = {
  paths: Paths;
  productName: string;
  slashCommands: SlashCommand[];
};

export type CommandEntry = {
  command: SlashCommand;
  source: CommandSource;
};

export class SlashCommandManager {
  commands: Map<string, CommandEntry>;
  constructor(opts: SlashCommandManagerOpts) {
    const productName = opts.productName;
    const commands = new Map<string, CommandEntry>();
    // 1. builtin
    const builtin = createBuiltinCommands({ productName });
    builtin.forEach((command) => {
      commands.set(command.name, { command, source: CommandSource.Builtin });
    });
    // 2. plugin
    (opts.slashCommands || []).forEach((command) => {
      commands.set(command.name, { command, source: CommandSource.Plugin });
    });
    // 3. global
    const global = this.#loadGlobal(
      path.join(opts.paths.globalConfigDir, 'commands'),
    );
    global.forEach((command) => {
      commands.set(command.command.name, command);
    });
    // 4. project
    const project = this.#loadProject(
      path.join(opts.paths.projectConfigDir, 'commands'),
    );
    project.forEach((command) => {
      commands.set(command.command.name, command);
    });
    this.commands = commands;
  }

  static async create(context: Context) {
    const pluginSlashCommands = await context.apply({
      hook: 'slashCommand',
      args: [],
      memo: [],
      type: PluginHookType.SeriesMerge,
    });
    return new SlashCommandManager({
      productName: context.productName,
      paths: context.paths,
      slashCommands: pluginSlashCommands,
    });
  }

  get(name: string): CommandEntry | undefined {
    const entry = this.commands.get(name);
    return entry;
  }

  getAll(): CommandEntry[] {
    return Array.from(this.commands.values()).filter((entry) =>
      this.#isCommandEnabled(entry.command),
    );
  }

  getCommandsBySource(source: CommandSource): CommandEntry[] {
    return Array.from(this.commands.values()).filter(
      (entry) =>
        entry.source === source && this.#isCommandEnabled(entry.command),
    );
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
      })
      .filter((command) => this.#isCommandEnabled(command));
  }

  #isCommandEnabled(command: SlashCommand): boolean {
    return command.isEnabled !== false;
  }

  #loadGlobal(globalConfigDir: string): CommandEntry[] {
    return loadPolishedMarkdownFiles(globalConfigDir).map((file) => {
      return {
        command: this.#fileToPromptCommand(file, 'global'),
        source: CommandSource.User,
      };
    });
  }

  #loadProject(projectConfigDir: string): CommandEntry[] {
    return loadPolishedMarkdownFiles(projectConfigDir).map((file) => {
      return {
        command: this.#fileToPromptCommand(file, 'project'),
        source: CommandSource.Project,
      };
    });
  }

  #fileToPromptCommand(
    file: NormalizedMarkdownFile,
    descriptionPostfix: string,
  ): PromptCommand {
    const command: PromptCommand = {
      type: 'prompt',
      name: file.name,
      description: file.description + ' (' + descriptionPostfix + ')',
      model: file.attributes.model,
      progressMessage:
        file.attributes.progressMessage || 'Executing command...',
      getPromptForCommand: async (args) => {
        let prompt = file.body.trim();
        // Check if prompt contains positional parameters ($1, $2, etc.)
        const hasPositionalParams = /\$[1-9]\d*/.test(prompt);

        if (hasPositionalParams) {
          // Replace positional parameters
          prompt = replaceParameterPlaceholders(prompt, args);
        } else if (prompt.includes('$ARGUMENTS')) {
          // Legacy $ARGUMENTS support
          prompt = prompt.replace(/\$ARGUMENTS/g, args || '');
        } else if (args.trim()) {
          // If no placeholders but args provided, append them
          prompt += `\n\nArguments: ${args}`;
        }

        return [
          {
            role: 'user',
            content: prompt,
          },
        ];
      },
    };
    return command;
  }
}

function isFilePath(input: string): boolean {
  // If the string starts with '/' and contains another '/', we consider it a file path.
  // This reliably identifies paths like '/path/to/file' while avoiding
  // misclassifying single-segment commands like '/help' or '/agent.run'.
  return input.startsWith('/') && input.indexOf('/', 1) !== -1;
}

export function parseSlashCommand(input: string): {
  command: string;
  args: string;
} {
  const trimmed = input.trim();
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

export function replaceParameterPlaceholders(
  prompt: string,
  args: string,
): string {
  const parsedArgs = args.split(' ');
  let result = prompt;

  // Replace positional parameters $1, $2, $3, etc.
  for (let i = 0; i < parsedArgs.length; i++) {
    const placeholder = `$${i + 1}`;
    const regex = new RegExp('\\' + placeholder + '\\b', 'g');
    result = result.replace(regex, parsedArgs[i] || '');
  }

  return result;
}

export function isSlashCommand(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return false;
  if (trimmed === '/') return false;
  const match = trimmed.match(/^\S+/);
  const commandPart = match ? match[0] : '';
  return commandPart !== '' && !isFilePath(commandPart);
}
