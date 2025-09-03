import path from 'path';
import { z } from 'zod';
import { createTool } from '../tool';
import {
  MAX_FILES,
  TRUNCATED_MESSAGE,
  createFileTree,
  listDirectory,
  printTree,
} from '../utils/list';
import type { LsToolResult } from './type';

export function createLSTool(opts: { cwd: string; productName: string }) {
  return createTool({
    name: 'ls',
    description: 'Lists files and directories in a given path.',
    parameters: z.object({
      dir_path: z.string().describe('The path to the directory to list.'),
    }),
    execute: async (params): Promise<LsToolResult> => {
      const { dir_path } = params;
      const fullFilePath = path.isAbsolute(dir_path)
        ? dir_path
        : path.resolve(opts.cwd, dir_path);
      const result = listDirectory(
        fullFilePath,
        opts.cwd,
        opts.productName,
      ).sort();
      const tree = createFileTree(result);
      const userTree = printTree(opts.cwd, tree);
      if (result.length < MAX_FILES) {
        return {
          success: true,
          message: `Listed ${result.length} files/directories`,
          data: userTree,
        };
      } else {
        const assistantData = `${TRUNCATED_MESSAGE}${userTree}`;
        return {
          success: true,
          message: `Listed ${result.length} files/directories (truncated)`,
          data: assistantData,
        };
      }
    },
    approval: {
      category: 'read',
    },
  });
}
