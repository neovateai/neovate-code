import fs from 'fs';
import path from 'path';
import { parseFrontMatter } from '../utils/frontmatter';
import { type PromptCommand } from './types';

export interface FilesystemCommandLoaderOptions {
  commandsDir: string;
  prefix: string; // 'user' or 'project'
}

export function loadFilesystemCommands(
  options: FilesystemCommandLoaderOptions,
): PromptCommand[] {
  const { commandsDir, prefix } = options;
  const commands: PromptCommand[] = [];

  // Check if commands directory exists
  if (!fs.existsSync(commandsDir)) {
    return commands;
  }

  try {
    const files = fs.readdirSync(commandsDir);

    for (const file of files) {
      // Only process .md files
      if (!file.endsWith('.md')) {
        continue;
      }

      const filePath = path.join(commandsDir, file);
      const stat = fs.statSync(filePath);

      // Skip directories
      if (!stat.isFile()) {
        continue;
      }

      // Extract command name from filename (remove .md extension)
      const commandName = path.basename(file, '.md');

      // Create command with prefix (user: or project:)
      const fullCommandName = `${prefix}:${commandName}`;

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { frontmatter, content: body } = parseFrontMatter(content);

        const command: PromptCommand = {
          type: 'prompt',
          name: fullCommandName,
          description: frontmatter?.description ?? '',
          model: frontmatter?.model,
          progressMessage: `Executing ${prefix} command...`,
          async getPromptForCommand(args: string) {
            // Use the file content as the prompt
            // Replace $ARGUMENTS placeholder with actual args
            let prompt = body.trim();
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

        commands.push(command);
      } catch (error) {
        console.warn(
          `Warning: Could not read command file ${filePath}:`,
          error,
        );
      }
    }
  } catch (error) {
    console.warn(
      `Warning: Could not read commands directory ${commandsDir}:`,
      error,
    );
  }

  return commands;
}

export function loadGlobalCommands(globalConfigDir: string): PromptCommand[] {
  const commandsDir = path.join(globalConfigDir, 'commands');
  return loadFilesystemCommands({
    commandsDir,
    prefix: 'user',
  });
}

export function loadProjectCommands(projectConfigDir: string): PromptCommand[] {
  const commandsDir = path.join(projectConfigDir, 'commands');
  return loadFilesystemCommands({
    commandsDir,
    prefix: 'project',
  });
}
