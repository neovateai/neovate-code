import { tool } from '@openai/agents';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { Context } from '../context';

export function createWriteTool(opts: { context: Context }) {
  return tool({
    name: 'write',
    description: 'Write a file to the local filesystem',
    parameters: z.object({
      file_path: z.string(),
      content: z.string(),
    }),
    execute: async ({ file_path, content }) => {
      try {
        const fullFilePath = path.isAbsolute(file_path)
          ? file_path
          : path.resolve(opts.context.cwd, file_path);
        const oldFileExists = fs.existsSync(fullFilePath);
        const oldContent = oldFileExists
          ? fs.readFileSync(fullFilePath, 'utf-8')
          : null;
        // TODO: backup old content
        // TODO: let user know if they want to write to a file that already exists
        const dir = path.dirname(fullFilePath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullFilePath, format(content));
        return `File successfully written to ${file_path}`;
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
  });
}

function format(content: string) {
  if (!content.endsWith('\n')) {
    return content + '\n';
  }
  return content;
}
