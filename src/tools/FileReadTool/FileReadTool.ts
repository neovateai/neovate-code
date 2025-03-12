import { tool } from 'ai';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
]);

export const fileReadTool = tool({
  description: 'Read a file from the local filesystem.',
  parameters: z.object({
    file_path: z.string(),
  }),
  execute: async ({ file_path }) => {
    console.log(`[FileReadTool] Reading file: ${file_path}`);
    // TODO: truncate if needed
    const content = fs.readFileSync(file_path, 'utf8');
    const ext = path.extname(file_path).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) {
      throw new Error("File is an image. It's not supported yet.");
    }
    return {
      filePath: file_path,
      content,
      totalLines: content.split('\n').length,
    };
  },
});
