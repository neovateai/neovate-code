import { execSync } from 'child_process';
import { FastMCP, UserError } from 'fastmcp';
import { existsSync } from 'fs';
import path from 'path';
import { z } from 'zod';

export interface ToolContext {
  server: FastMCP;
  root: string;
}

function getBinPath(root: string) {
  const binDir = path.join(root, 'node_modules', '.bin');
  if (existsSync(binDir)) {
    return path.join(binDir, 'takumi');
  }
  throw new UserError('takumi not found in node_modules/.bin');
}

export function registerTools(opts: ToolContext) {
  const { server, root } = opts;
  const binPath = getBinPath(root);

  server.addTool({
    name: 'takumi-help',
    description: 'Display help information for the Takumi CLI.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const result = execSync(`${binPath} help`, { cwd: root });
        return {
          type: 'text',
          text: result.toString(),
        };
      } catch (error: any) {
        return {
          type: 'text',
          text: error.message || 'Failed to display help information',
        };
      }
    },
  });

  server.addTool({
    name: 'takumi-version',
    description: 'Display the current version of Takumi CLI.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const result = execSync(`${binPath} --version`, { cwd: root });
        return {
          type: 'text',
          text: result.toString(),
        };
      } catch (error: any) {
        return {
          type: 'text',
          text: error.message || 'Failed to get version',
        };
      }
    },
  });
}
