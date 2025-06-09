import { tool } from '@openai/agents';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { applyEdit } from '../../utils/applyEdit';
import { Context } from '../context';

export function createBashTool(opts: { context: Context }) {
  return tool({
    name: 'bash',
    description: `
Run shell commands on the local filesystem.
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
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
  });
}
