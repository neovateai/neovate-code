import fs from 'fs';
import path from 'path';
import { parseFrontMatter } from '../utils/frontmatter';
import { kebabToTitleCase } from '../utils/string';
import { type PromptCommand } from './types';

export interface FilesystemCommandLoaderOptions {
  commandsDir: string;
  postfix?: string;
}

/**
 * Resolves command description using fallback logic:
 * 1. Use YAML frontmatter description if available
 * 2. If not found, check if first line starts with a letter (a-zA-Z) - if so, use it as description
 * 3. If not found, convert filename without extension to Title Case
 */
function resolveCommandDescription(
  frontmatterDescription: string | undefined,
  content: string,
  commandName: string,
): string {
  // Step 1: Use frontmatter description if available
  if (frontmatterDescription && frontmatterDescription.trim()) {
    return frontmatterDescription.trim();
  }

  // Step 2: Check if first line starts with a letter to use as description
  const lines = content.split('\n');
  const firstLine = lines.find((line) => line.trim())?.trim();
  if (firstLine && /^[a-zA-Z]/.test(firstLine)) {
    return firstLine;
  }

  // Step 3: Convert filename to Title Case
  return kebabToTitleCase(commandName);
}

export function loadFilesystemCommands(
  options: FilesystemCommandLoaderOptions,
): PromptCommand[] {
  const { commandsDir, postfix } = options;
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

      // Validate command name to prevent injection attacks
      if (!/^[a-zA-Z0-9_-]+$/.test(commandName)) {
        console.warn(`Skipping invalid command name: ${commandName}`);
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { frontmatter, content: body } = parseFrontMatter(content);

        const baseDescription = resolveCommandDescription(
          frontmatter?.description,
          body,
          commandName,
        );
        const description = postfix
          ? `${baseDescription} (${postfix})`
          : baseDescription;

        const command: PromptCommand = {
          type: 'prompt',
          name: commandName,
          description,
          model: frontmatter?.model,
          progressMessage: `Executing command...`,
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
    postfix: 'user',
  });
}

export function loadProjectCommands(projectConfigDir: string): PromptCommand[] {
  const commandsDir = path.join(projectConfigDir, 'commands');
  return loadFilesystemCommands({
    commandsDir,
    postfix: 'project',
  });
}
