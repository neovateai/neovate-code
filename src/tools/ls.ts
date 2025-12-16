import path from 'pathe';
import { z } from 'zod';
import { createTool } from '../tool';
import {
  createFileTree,
  listDirectory,
  MAX_FILES,
  printTree,
  TRUNCATED_MESSAGE,
} from '../utils/list';

export function createLSTool(opts: { cwd: string }) {
  return createTool({
    name: 'ls',
    description: 'Lists files and directories in a given path.',
    parameters: z.object({
      dir_path: z.string().describe('The path to the directory to list.'),
    }),
    getDescription: ({ params }) => {
      if (!params.dir_path || typeof params.dir_path !== 'string') {
        return '.';
      }
      return path.relative(opts.cwd, params.dir_path);
    },
    execute: async (params) => {
      const { dir_path } = params;
      const fullFilePath = path.isAbsolute(dir_path)
        ? dir_path
        : path.resolve(opts.cwd, dir_path);
      const result = listDirectory(fullFilePath, opts.cwd).sort();
      const tree = createFileTree(result);
      const userTree = printTree(opts.cwd, tree);
      if (result.length < MAX_FILES) {
        return {
          returnDisplay: `Listed ${result.length} files/directories`,
          llmContent: userTree,
        };
      } else {
        const assistantData = `${TRUNCATED_MESSAGE}${userTree}`;
        return {
          returnDisplay: `Listed ${result.length} files/directories (truncated)`,
          llmContent: assistantData,
        };
      }
    },
    approval: {
      category: 'read',
    },
  });
}
