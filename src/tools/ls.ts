import { tool } from '@openai/agents';
import path from 'path';
import { z } from 'zod';
import { Context } from '../context';
import {
  MAX_FILES,
  TRUNCATED_MESSAGE,
  createFileTree,
  listDirectory,
  printTree,
} from '../utils/list';

export function createLSTool(opts: { context: Context }) {
  return tool({
    name: 'ls',
    description: 'Lists files and directories in a given path.',
    parameters: z.object({
      dir_path: z.string().describe('The path to the directory to list.'),
    }),
    execute: async ({ dir_path }) => {
      const fullFilePath = path.isAbsolute(dir_path)
        ? dir_path
        : path.resolve(opts.context.cwd, dir_path);
      const result = listDirectory(fullFilePath, opts.context.cwd).sort();
      const tree = createFileTree(result);
      const userTree = printTree(opts.context.cwd, tree);
      if (result.length < MAX_FILES) {
        return userTree;
      } else {
        const assistantData = `${TRUNCATED_MESSAGE}${userTree}`;
        return assistantData;
      }
    },
  });
}
