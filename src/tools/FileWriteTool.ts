import { tool } from 'ai';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import { z } from 'zod';
import { PluginHookType } from '../pluginManager/pluginManager';
import { Context } from '../types';
import { requestWritePermission } from '../utils/approvalMode';
import { logInfo } from '../v2/utils/logger';

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
      try {
        const fullFilePath = isAbsolute(file_path)
          ? file_path
          : resolve(opts.context.cwd, file_path);
        const {
          config: { approvalMode },
        } = opts.context;

        await requestWritePermission(approvalMode, fullFilePath);

        const dir = dirname(fullFilePath);
        const oldFileExists = existsSync(fullFilePath);
        const enc = 'utf-8';
        const oldContent = oldFileExists
          ? readFileSync(fullFilePath, enc)
          : null;
        if (oldContent) {
          await opts.context.pluginManager.apply({
            hook: 'editFile',
            args: [
              {
                filePath: fullFilePath,
                oldContent: oldContent,
                newContent: content,
              },
            ],
            type: PluginHookType.Series,
            pluginContext: opts.context.pluginContext,
          });
        } else {
          await opts.context.pluginManager.apply({
            hook: 'createFile',
            args: [{ filePath: fullFilePath, content: content }],
            type: PluginHookType.Series,
            pluginContext: opts.context.pluginContext,
          });
        }
        mkdirSync(dir, { recursive: true });
        writeFileSync(fullFilePath, addNewLineIfMissing(content), enc);

        logInfo(`File ${file_path} updated`);
        return `File written successfully: ${fullFilePath}`;
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
  });
}

function addNewLineIfMissing(content: string) {
  if (!content.endsWith('\n')) {
    return content + '\n';
  }
  return content;
}
