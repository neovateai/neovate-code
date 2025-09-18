import fs from 'fs';
import path from 'pathe';
import { z } from 'zod';
import { createTool } from '../tool';
import { applyEdit } from '../utils/applyEdit';

export function createEditTool(opts: { cwd: string }) {
  return createTool({
    name: 'edit',
    description: `
Edit files in the local filesystem.
Usage:
- You must use your read tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
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
    getDescription: ({ params, cwd }) => {
      if (!params.file_path || typeof params.file_path !== 'string') {
        return 'No file path provided';
      }
      return path.relative(cwd, params.file_path);
    },
    execute: async ({ file_path, old_string, new_string }) => {
      try {
        const cwd = opts.cwd;
        const fullFilePath = path.isAbsolute(file_path)
          ? file_path
          : path.resolve(cwd, file_path);
        const relativeFilePath = path.relative(cwd, fullFilePath);
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
          llmContent: `File ${file_path} successfully edited.`,
          returnDisplay: {
            type: 'diff_viewer',
            filePath: relativeFilePath,
            originalContent: { inputKey: 'old_string' },
            newContent: { inputKey: 'new_string' },
            absoluteFilePath: fullFilePath,
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
