import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { createTool } from '../tool';
import type { WriteToolResult } from './type';

export function createWriteTool(opts: { cwd: string }) {
  return createTool({
    name: 'write',
    description: 'Write a file to the local filesystem',
    parameters: z.object({
      file_path: z.string(),
      content: z.string(),
    }),
    execute: async ({ file_path, content }): Promise<WriteToolResult> => {
      try {
        const fullFilePath = path.isAbsolute(file_path)
          ? file_path
          : path.resolve(opts.cwd, file_path);
        const oldFileExists = fs.existsSync(fullFilePath);
        const oldContent = oldFileExists
          ? fs.readFileSync(fullFilePath, 'utf-8')
          : null;
        // TODO: backup old content
        // TODO: let user know if they want to write to a file that already exists
        const dir = path.dirname(fullFilePath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullFilePath, format(content));
        return {
          llmContent: `File successfully written to ${file_path}`,
          returnDisplay: {
            filePath: file_path,
            relativeFilePath: path.relative(opts.cwd, fullFilePath),
            oldContent,
            content,
            type: oldFileExists ? 'replace' : 'add',
          },
        };
      } catch (e) {
        return {
          isError: true,
          llmContent: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
    approval: {
      category: 'write',
    },
  });
}

function format(content: string) {
  if (!content.endsWith('\n')) {
    return content + '\n';
  }
  return content;
}
