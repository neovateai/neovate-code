import { tool } from '@openai/agents';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { Context } from '../context';

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
]);

export function createReadTool(opts: { context: Context }) {
  return tool({
    name: 'read',
    description: 'Read a file from the local filesystem',
    parameters: z.object({
      file_path: z.string(),
    }),
    strict: true,
    execute: async ({ file_path }) => {
      try {
        const ext = path.extname(file_path).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext)) {
          throw new Error("File is an image. It's not supported yet.");
        }

        const fullFilePath = path.isAbsolute(file_path)
          ? file_path
          : path.resolve(opts.context.cwd, file_path);
        const content = fs.readFileSync(fullFilePath, 'utf-8');
        return {
          success: true,
          data: {
            filePath: file_path,
            content,
            totalLines: content.split('\n').length,
          },
        };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
  });
}
