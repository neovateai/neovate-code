import { type FastifyPluginAsync } from 'fastify';
import fs from 'fs';
import { homedir } from 'os';
import path from 'path';
import { parseFrontMatter } from '../../utils/frontmatter';
import { kebabToTitleCase } from '../../utils/string';
import { type CreateServerOpts } from '../types';

interface SerializableSlashCommandItem {
  name: string;
  description: string;
  path: string;
  type: 'global' | 'project';
}

function scanCommandsDirectory(
  commandsDir: string,
  type: 'global' | 'project',
): SerializableSlashCommandItem[] {
  const commands: SerializableSlashCommandItem[] = [];

  if (!fs.existsSync(commandsDir)) {
    return commands;
  }

  try {
    const markdownFiles = findMarkdownFiles(commandsDir, commandsDir);

    for (const filePath of markdownFiles) {
      const relativePath = path.relative(commandsDir, filePath);
      const commandName = relativePath
        .replace(/\.md$/, '')
        .replace(/[\/\\]/g, ':');

      if (!/^[a-zA-Z0-9_:-]+$/.test(commandName)) {
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { frontmatter, content: body } = parseFrontMatter(content);

        const description = resolveCommandDescription(
          frontmatter?.description,
          body,
          commandName,
        );

        commands.push({
          name: commandName,
          description,
          path: filePath,
          type,
        });
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

function findMarkdownFiles(dir: string, baseDir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath, baseDir));
      } else if (stat.isFile() && entry.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }

  return files;
}

function resolveCommandDescription(
  frontmatterDescription: string | undefined,
  content: string,
  commandName: string,
): string {
  if (frontmatterDescription && frontmatterDescription.trim()) {
    return frontmatterDescription.trim();
  }

  const lines = content.split('\n');
  const firstLine = lines.find((line) => line.trim())?.trim();
  if (firstLine && /^[a-zA-Z]/.test(firstLine)) {
    return firstLine;
  }

  return kebabToTitleCase(commandName);
}

const slashCommandRoute: FastifyPluginAsync<CreateServerOpts> = async (
  app,
  opts,
) => {
  app.get('/slash-commands/list', async (request, reply) => {
    try {
      const cwd = opts.context.cwd;

      const globalCommandsDir = path.join(homedir(), '.takumi', 'commands');
      const projectCommandsDir = path.join(cwd, '.takumi', 'commands');

      const globalCommands = scanCommandsDirectory(globalCommandsDir, 'global');
      const projectCommands = scanCommandsDirectory(
        projectCommandsDir,
        'project',
      );

      const allCommands = [...globalCommands, ...projectCommands];

      return reply.send({
        success: true,
        data: {
          commands: allCommands,
        },
      });
    } catch (error) {
      console.error('Slash command list API error:', error);

      return reply.code(500).send({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while getting slash command list',
      });
    }
  });
};

export default slashCommandRoute;
