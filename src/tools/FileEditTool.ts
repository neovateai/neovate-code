import { tool } from 'ai';
import { mkdirSync, writeFileSync } from 'fs';
import fs from 'fs';
import path from 'path';
import { isAbsolute } from 'path';
import { z } from 'zod';
import { PluginHookType } from '../pluginManager/pluginManager';
import { Context } from '../types';
import { applyEdit } from '../utils/applyEdit';

const description = `
This is a tool for editing files. For moving or renaming files, you should generally use the Bash tool with the 'mv' command instead. For larger edits, use the Write tool to overwrite files.

Before using this tool:
1. Use the View tool to understand the file's contents and context
2. Verify the directory path is correct (only applicable when creating new files):
   - Use the LS tool to verify the parent directory exists and is the correct location

To make a file edit, provide the following:
1. file_path: The absolute path to the file to modify (must be absolute, not relative)
2. old_string: The text to replace (must be unique within the file, and must match the file contents exactly, including all whitespace and indentation)
3. new_string: The edited text to replace the old_string

The tool will replace ONE occurrence of old_string with new_string in the specified file.

If you want to create a new file, use:
   - A new file path, including dir name if needed
   - An empty old_string
   - The new file's contents as new_string

Remember: when making multiple file edits in a row to the same file, you should prefer to send all edits in a single message with multiple calls to this tool, rather than multiple messages with a single call each.
`;

export function createFileEditTool(opts: { context: Context }) {
  return tool({
    description,
    parameters: z.object({
      file_path: z.string().describe('The absolute path to the file to modify'),
      old_string: z.string().describe('The text to replace'),
      new_string: z
        .string()
        .describe('The text to replace the old_string with'),
    }),
    execute: async ({ file_path, old_string, new_string }) => {
      try {
        const { patch, updatedFile } = applyEdit(
          opts.context.cwd,
          file_path,
          old_string,
          new_string,
        );
        const fullFilePath = isAbsolute(file_path)
          ? file_path
          : path.resolve(opts.context.cwd, file_path);
        const dir = path.dirname(fullFilePath);
        mkdirSync(dir, { recursive: true });
        await opts.context.pluginManager.apply({
          hook: 'editFile',
          args: [
            {
              filePath: fullFilePath,
              oldContent: fs.readFileSync(fullFilePath, 'utf-8'),
              newContent: updatedFile,
            },
          ],
          type: PluginHookType.Series,
          pluginContext: opts.context.pluginContext,
        });
        writeFileSync(fullFilePath, updatedFile, 'utf-8');
        return {
          success: true,
          patch,
          updatedFile,
        };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
          patch: null,
          updatedFile: null,
        };
      }
    },
  });
}
