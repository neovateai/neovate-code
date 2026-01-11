import fs from 'fs';
import path from 'pathe';
import { z } from 'zod';
import { TOOL_NAMES } from '../constants';
import { createTool } from '../tool';

export function createWriteTool(opts: { cwd: string }) {
  return createTool({
    name: TOOL_NAMES.WRITE,
    description: `Writes a file to the local filesystem

Usage:
- This tool will overwrite the existing file if there is one at the provided path.
- If this is an existing file, you MUST use the ${TOOL_NAMES.READ} tool first to read the file's contents. This tool will fail if you did not read the file first.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.`,
    parameters: z.object({
      file_path: z.string(),
      content: z.string(),
    }),
    getDescription: ({ params, cwd }) => {
      if (!params.file_path || typeof params.file_path !== 'string') {
        return 'No file path provided';
      }
      return path.relative(cwd, params.file_path);
    },
    execute: async ({ file_path, content }) => {
      try {
        const fullFilePath = path.isAbsolute(file_path)
          ? file_path
          : path.resolve(opts.cwd, file_path);
        const oldFileExists = fs.existsSync(fullFilePath);
        const oldContent = oldFileExists
          ? fs.readFileSync(fullFilePath, 'utf-8')
          : '';
        // TODO: backup old content
        // TODO: let user know if they want to write to a file that already exists
        const dir = path.dirname(fullFilePath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullFilePath, format(content));
        return {
          llmContent: `File successfully written to ${file_path}`,
          returnDisplay: {
            type: 'diff_viewer',
            filePath: path.relative(opts.cwd, fullFilePath),
            absoluteFilePath: fullFilePath,
            originalContent: oldContent,
            newContent: { inputKey: 'content' },
            writeType: oldFileExists ? 'replace' : 'add',
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
