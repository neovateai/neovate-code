import { tool } from '@openai/agents';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { Context } from '../context';
import { applyEdit } from '../utils/applyEdit';

export function createEditTool(opts: { context: Context }) {
  return tool({
    name: 'edit',
    description: `
Edit files in the local filesystem.
Remembers:
- Use the read tool to understand the file's contents before using this tool.
- For moving or renaming files, you should generally use the Bash tool with the 'mv' command instead.
- For larger edits, use the Write tool to overwrite files.
- For file creation, use the Write tool.
- When making multiple file edits in a row to the same file, you should prefer to send all edits in a single message with multiple calls to this tool, rather than multiple messages with a single call each.
`.trim(),
    parameters: z.object({
      file_path: z.string().describe('The path of the file to modify'),
      old_string: z.string().describe('The text to replace'),
      new_string: z
        .string()
        .describe('The text to replace the old_string with'),
    }),
    execute: async ({ file_path, old_string, new_string }) => {
      try {
        const cwd = opts.context.cwd;
        const fullFilePath = path.isAbsolute(file_path)
          ? file_path
          : path.resolve(cwd, file_path);
        const { patch, updatedFile } = applyEdit(
          cwd,
          fullFilePath,
          old_string,
          new_string,
          'search-replace',
        );
        const dir = path.dirname(fullFilePath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullFilePath, updatedFile, 'utf-8');
        return {
          success: true,
          data: {
            message: `File ${file_path} successfully edited.`,
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
