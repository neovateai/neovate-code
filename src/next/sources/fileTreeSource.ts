import fs from 'fs';
import { minimatch } from 'minimatch';
import path from 'path';
import { type SourceOptions } from '../dataSource';

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  children?: FileTreeNode[];
}

export interface FileTreeData {
  root: string;
  tree: FileTreeNode;
  fileCount: number;
  directoryCount: number;
  totalSize: number;
}

export interface FileTreeOptions {
  cwd: string;
  maxDepth?: number;
  ignore?: string[];
  includeHidden?: boolean;
  followSymlinks?: boolean;
}

const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  'tmp',
  'temp',
];

export function createFileTreeSource(
  options: FileTreeOptions,
): SourceOptions<FileTreeData> {
  const {
    cwd,
    maxDepth = 10,
    ignore = DEFAULT_IGNORE,
    includeHidden = false,
    followSymlinks = false,
  } = options;

  return {
    fetcher: async () => {
      let fileCount = 0;
      let directoryCount = 0;
      let totalSize = 0;

      const shouldIgnore = (filePath: string, name: string): boolean => {
        // Check if hidden file (starts with .)
        if (!includeHidden && name.startsWith('.') && name !== '.') {
          return true;
        }

        // Check ignore patterns
        for (const pattern of ignore) {
          if (minimatch(filePath, pattern) || minimatch(name, pattern)) {
            return true;
          }
        }

        return false;
      };

      const buildTree = (
        dirPath: string,
        depth: number = 0,
      ): FileTreeNode | null => {
        if (depth > maxDepth) {
          return null;
        }

        const name = path.basename(dirPath);
        const relativePath = path.relative(cwd, dirPath);

        if (shouldIgnore(relativePath, name) && dirPath !== cwd) {
          return null;
        }

        try {
          const stats = followSymlinks
            ? fs.statSync(dirPath)
            : fs.lstatSync(dirPath);

          if (stats.isDirectory()) {
            directoryCount++;
            const children: FileTreeNode[] = [];

            try {
              const entries = fs.readdirSync(dirPath);

              for (const entry of entries) {
                const entryPath = path.join(dirPath, entry);
                const node = buildNode(entryPath, depth + 1);
                if (node) {
                  children.push(node);
                }
              }
            } catch (err) {
              // Unable to read directory
            }

            return {
              name,
              path: relativePath,
              type: 'directory',
              children: children.sort((a, b) => {
                // Directories first, then files
                if (a.type !== b.type) {
                  return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
              }),
            };
          } else {
            fileCount++;
            totalSize += stats.size;

            return {
              name,
              path: relativePath,
              type: 'file',
              size: stats.size,
              modified: stats.mtime,
            };
          }
        } catch (err) {
          // Unable to stat file/directory
          return null;
        }
      };

      const buildNode = (
        nodePath: string,
        depth: number,
      ): FileTreeNode | null => {
        const stats = followSymlinks
          ? fs.statSync(nodePath)
          : fs.lstatSync(nodePath);

        if (stats.isDirectory()) {
          return buildTree(nodePath, depth);
        } else {
          const name = path.basename(nodePath);
          const relativePath = path.relative(cwd, nodePath);

          if (shouldIgnore(relativePath, name)) {
            return null;
          }

          fileCount++;
          totalSize += stats.size;

          return {
            name,
            path: relativePath,
            type: 'file',
            size: stats.size,
            modified: stats.mtime,
          };
        }
      };

      const tree = buildTree(cwd, 0);

      return {
        root: cwd,
        tree: tree || {
          name: path.basename(cwd),
          path: '',
          type: 'directory',
          children: [],
        },
        fileCount,
        directoryCount,
        totalSize,
      };
    },
    ttl: 30000, // 30 seconds cache
  };
}
