import fs from 'fs';
import path from 'pathe';
import { z } from 'zod';
import { TOOL_NAMES } from '../constants';
import { createTool } from '../tool';
import { applyEdits } from '../utils/applyEdit';

export function createEditTool(opts: { cwd: string }) {
  return createTool({
    name: TOOL_NAMES.EDIT,
    description: `
Performs exact string replacements in files.

Usage:
- You must use your ${TOOL_NAMES.READ} tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.
- When editing text from ${TOOL_NAMES.READ} tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- The edit will FAIL if \`old_string\` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use \`replace_all\` to change every instance of \`old_string\`.
- Use \`replace_all\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.
- For moving or renaming files, you should generally use the ${TOOL_NAMES.BASH} tool with the 'mv' command instead.
- For larger edits, use the ${TOOL_NAMES.WRITE} tool to overwrite files.
- For file creation, use the ${TOOL_NAMES.WRITE} tool.
`.trim(),
    parameters: z.object({
      file_path: z.string().describe('The path of the file to modify'),
      old_string: z.string().describe('The text to replace'),
      new_string: z
        .string()
        .describe('The text to replace the old_string with'),
      replace_all: z
        .boolean()
        .default(false)
        .describe(
          'Whether to replace all occurrences of old_string with new_string',
        ),
    }),
    getDescription: ({ params, cwd }) => {
      if (!params.file_path || typeof params.file_path !== 'string') {
        return 'No file path provided';
      }
      return path.relative(cwd, params.file_path);
    },
    execute: async ({ file_path, old_string, new_string, replace_all }) => {
      if (old_string === new_string) {
        return {
          isError: true,
          llmContent: 'new_string must differ from old_string',
        };
      }
      try {
        const cwd = opts.cwd;
        const fullFilePath = path.isAbsolute(file_path)
          ? file_path
          : path.resolve(cwd, file_path);
        const relativeFilePath = path.relative(cwd, fullFilePath);
        const { patch, updatedFile, startLineNumber } = applyEdits(
          cwd,
          fullFilePath,
          [{ old_string, new_string, replace_all }],
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
            startLineNumber,
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
