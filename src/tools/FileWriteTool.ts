import { tool } from 'ai';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import { z } from 'zod';
import { Context } from '../types';

export function createFileWriteTool(opts: { context: Context }) {
  return tool({
    description: `
Write a file to the local filesystem. Overwrites the existing file if there is one.
Before using this tool:
1. Use the ReadFile tool to understand the file's contents and context
2. Directory Verification (only applicable when creating new files):
   - Use the LS tool to verify the parent directory exists and is the correct location
  `.trim(),
    parameters: z.object({
      file_path: z.string(),
      content: z.string(),
    }),
    execute: async ({ file_path, content }) => {
      const fullFilePath = isAbsolute(file_path)
        ? file_path
        : resolve(opts.context.cwd, file_path);
      const dir = dirname(fullFilePath);
      const oldFileExists = existsSync(fullFilePath);
      const enc = 'utf-8';
      const oldContent = oldFileExists ? readFileSync(fullFilePath, enc) : null;
      mkdirSync(dir, { recursive: true });
      writeFileSync(fullFilePath, addNewLineIfMissing(content), enc);
      return `File written successfully: ${fullFilePath}`;
    },
  });
}

function addNewLineIfMissing(content: string) {
  if (!content.endsWith('\n')) {
    return content + '\n';
  }
  return content;
}
