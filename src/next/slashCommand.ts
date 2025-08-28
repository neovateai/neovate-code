import path from 'path';
import { PluginHookType } from '../plugin';
import { createBuiltinCommands } from '../slash-commands/builtin';
import {
  CommandSource,
  type PromptCommand,
  type SlashCommand,
} from '../slash-commands/types';
import type { Context } from './context';
import {
  type NormalizedMarkdownFile,
  loadPolishedMarkdownFiles,
} from './outputStyle';
import type { Paths } from './paths';

export type SlashCommandManagerOpts = {
  paths: Paths;
  productName: string;
  slashCommands: SlashCommand[];
};

type CommandEntry = {
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
      hook: 'command',
      args: [],
      type: PluginHookType.SeriesMerge,
    });
    return new SlashCommandManager({
      productName: context.productName,
      paths: context.paths,
      slashCommands: pluginSlashCommands,
    });
  }

  get(name: string): SlashCommand | undefined {
    const entry = this.commands.get(name);
    return entry?.command;
  }

  getAll(): SlashCommand[] {
    return Array.from(this.commands.values()).map((entry) => entry.command);
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
        if (prompt.includes('$ARGUMENTS')) {
          prompt = prompt.replace(/\$ARGUMENTS/g, args || '');
        } else if (args.trim()) {
          // If no $ARGUMENTS placeholder but args provided, append them
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

export function parseSlashCommand(
  input: string,
): { command: string; args: string } | null {
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

export function isSlashCommand(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith('/') && !isFilePath(trimmed);
}
