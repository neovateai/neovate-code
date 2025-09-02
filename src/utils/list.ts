import fs from 'fs';
import { basename, join, relative, sep } from 'path';
import { PRODUCT_NAME } from '../constants';
import { isIgnored } from './ignore';

export const MAX_FILES = 1000;
export const TRUNCATED_MESSAGE = `There are more than ${MAX_FILES} files in the repository. Use the LS tool (passing a specific path), Bash tool, and other tools to explore nested directories. The first ${MAX_FILES} files and directories are included below:\n\n`;

export function listDirectory(
  initialPath: string,
  cwd: string,
  productName: string = PRODUCT_NAME,
  maxFiles: number = MAX_FILES,
) {
  const results: string[] = [];
  const queue = [initialPath];
  while (queue.length > 0) {
    if (results.length > maxFiles) {
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
      children = fs.readdirSync(path, { withFileTypes: true });
    } catch (e) {
      // eg. EPERM, EACCES, ENOENT, etc.
      console.error(`[LsTool] Error listing directory: ${path}`, e);
      continue;
    }
    for (const child of children) {
      if (child.name === 'node_modules') {
        continue;
      }

      const childPath = join(path, child.name);

      // Skip if ignored by gitignore or takumiignore
      if (isIgnored(childPath, cwd, productName)) {
        continue;
      }

      if (child.isDirectory()) {
        queue.push(childPath + sep);
      } else {
        if (skip(childPath)) {
          continue;
        }
        results.push(relative(cwd, childPath));
        if (results.length > maxFiles) {
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

export function listRootDirectory(
  rootPath: string,
  productName: string = PRODUCT_NAME,
): string[] {
  const results: string[] = [];
  try {
    const children = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const child of children) {
      if (child.name === 'node_modules' || child.name.startsWith('.')) {
        continue;
      }

      const childPath = join(rootPath, child.name);

      // Skip if ignored by gitignore or takumiignore
      if (isIgnored(childPath, rootPath, productName)) {
        continue;
      }

      if (child.isDirectory()) {
        results.push(child.name + sep);
      } else {
        results.push(child.name);
      }
    }
  } catch (e) {
    console.error(`Error listing root directory: ${rootPath}`, e);
  }
  return results;
}

type TreeNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
};

export function createFileTree(sortedPaths: string[]): TreeNode[] {
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
export function printTree(
  cwd: string,
  tree: TreeNode[],
  level = 0,
  prefix = '',
): string {
  let result = '';

  // Add absolute path at root level
  if (level === 0) {
    result += `- ${cwd}${sep}\n`;
    prefix = '  ';
  }

  for (const node of tree) {
    // Add the current node to the result
    result += `${prefix}${'-'} ${node.name}${node.type === 'directory' ? sep : ''}\n`;

    // Recursively print children if they exist
    if (node.children && node.children.length > 0) {
      result += printTree(cwd, node.children, level + 1, `${prefix}  `);
    }
  }

  return result;
}
