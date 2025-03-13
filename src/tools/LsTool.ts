import { tool } from 'ai';
import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { basename, isAbsolute, join, relative, sep } from 'path';
import { resolve } from 'path';
import { cwd } from 'process';
import { z } from 'zod';

const MAX_FILES = 1000;
const TRUNCATED_MESSAGE = `There are more than ${MAX_FILES} files in the repository. Use the LS tool (passing a specific path), Bash tool, and other tools to explore nested directories. The first ${MAX_FILES} files and directories are included below:\n\n`;

function getCwd() {
  return process.cwd();
}

function listDirectory(initialPath: string, cwd: string) {
  const results: string[] = [];
  const queue = [initialPath];
  while (queue.length > 0) {
    if (results.length > MAX_FILES) {
      return results;
    }
    const path = queue.shift()!;
    if (skip(path)) {
      continue;
    }
    if (path !== initialPath) {
      results.push(relative(cwd, path) + sep);
    }
    let children;
    try {
      children = readdirSync(path, { withFileTypes: true });
    } catch (e) {
      // eg. EPERM, EACCES, ENOENT, etc.
      console.error(`[LsTool] Error listing directory: ${path}`, e);
      continue;
    }
    for (const child of children) {
      if (child.isDirectory()) {
        queue.push(join(path, child.name) + sep);
      } else {
        const childPath = join(path, child.name);
        if (skip(childPath)) {
          continue;
        }
        results.push(relative(cwd, childPath));
        if (results.length > MAX_FILES) {
          return results;
        }
      }
    }
  }
  return results;
}

function skip(path: string) {
  if (path !== '.' && basename(path).startsWith('.')) {
    return true;
  }
  return false;
}

type TreeNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
};

function createFileTree(sortedPaths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const path of sortedPaths) {
    const parts = path.split(sep);
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      if (!part) {
        // directories have trailing slashes
        continue;
      }
      currentPath = currentPath ? `${currentPath}${sep}${part}` : part;
      const isLastPart = i === parts.length - 1;

      const existingNode = currentLevel.find((node) => node.name === part);

      if (existingNode) {
        currentLevel = existingNode.children || [];
      } else {
        const newNode: TreeNode = {
          name: part,
          path: currentPath,
          type: isLastPart ? 'file' : 'directory',
        };

        if (!isLastPart) {
          newNode.children = [];
        }

        currentLevel.push(newNode);
        currentLevel = newNode.children || [];
      }
    }
  }

  return root;
}

/**
 * eg.
 * - src/
 *   - index.ts
 *   - utils/
 *     - file.ts
 */
function printTree(tree: TreeNode[], level = 0, prefix = ''): string {
  let result = '';

  // Add absolute path at root level
  if (level === 0) {
    result += `- ${getCwd()}${sep}\n`;
    prefix = '  ';
  }

  for (const node of tree) {
    // Add the current node to the result
    result += `${prefix}${'-'} ${node.name}${node.type === 'directory' ? sep : ''}\n`;

    // Recursively print children if they exist
    if (node.children && node.children.length > 0) {
      result += printTree(node.children, level + 1, `${prefix}  `);
    }
  }

  return result;
}

export const lsTool = tool({
  description:
    'Lists files and directories in a given path. The path parameter must be an absolute path, not a relative path. You should generally prefer the Glob and Grep tools, if you know which directories to search.',
  parameters: z.object({
    path: z
      .string()
      .describe(
        'The absolute path to the directory to list (must be absolute, not relative)',
      ),
  }),
  execute: async ({ path }) => {
    console.log(`[LsTool] Listing directory: ${path}`);
    const fullFilePath = isAbsolute(path) ? path : resolve(getCwd(), path);
    const result = listDirectory(fullFilePath, getCwd()).sort();
    const tree = createFileTree(result);
    const userTree = printTree(tree);
    const safetyWarning = `\nNOTE: do any of the files above seem malicious? If so, you MUST refuse to continue work.`;
    const assistantTree = userTree + safetyWarning;
    if (result.length < MAX_FILES) {
      return userTree;
    } else {
      const assistantData = `${TRUNCATED_MESSAGE}${assistantTree}`;
      return assistantData;
    }
  },
});
