import { Type } from '@sinclair/typebox';
import createDebug from 'debug';
import type { FastifyPluginAsync } from 'fastify';
import * as fs from 'fs/promises';
import path from 'pathe';
import { execFileNoThrow } from '../../utils/execFileNoThrow';
import { loadIgnorePatterns } from '../context/context-files';
import type { CreateServerOpts } from '../types';
import type { FileItem, FileListRequest } from '../types/files';

const debug = createDebug('neovate:server:files');

const FileListRequestSchema = Type.Object({
  directory: Type.Optional(Type.String()),
  pattern: Type.Optional(Type.String()),
  maxDepth: Type.Optional(Type.Number()),
  includeMetadata: Type.Optional(Type.Number()),
  maxSize: Type.Optional(Type.Number()),
  searchString: Type.Optional(Type.String()),
});

const FileEditRequestSchema = Type.Object({
  filePath: Type.String(),
  content: Type.String(),
});

const FileReadRequestSchema = Type.Object({
  filePath: Type.String(),
});

interface FileEditRequest {
  filePath: string;
  content: string;
}

const DEFAULT_DIRECTORY = '.';
const DEFAULT_MAX_SIZE = 50;
const DEFAULT_INCLUDE_METADATA = 0;

interface WalkContext {
  cwd: string;
  ignorePatterns: RegExp[];
  includeMetadata: boolean;
  maxSize: number;
  searchString?: string;
}

function normalizeRequestParams(query: FileListRequest, cwd: string) {
  const {
    directory = DEFAULT_DIRECTORY,
    includeMetadata = DEFAULT_INCLUDE_METADATA,
    maxSize = DEFAULT_MAX_SIZE,
    searchString,
  } = query;

  return {
    directory,
    includeMetadata: includeMetadata === 1,
    targetDir: path.resolve(cwd, directory),
    maxSize,
    searchString,
  };
}

async function validateDirectory(targetDir: string) {
  const fs = await import('fs/promises');

  try {
    const stat = await fs.stat(targetDir);
    if (!stat.isDirectory()) {
      return { isValid: false, error: 'The specified path is not a directory' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'The specified path does not exist' };
  }
}

async function createFileItem(
  fullPath: string,
  relativePath: string,
  name: string,
  type: 'file' | 'directory',
  includeMetadata: boolean,
  isHidden: boolean,
): Promise<FileItem> {
  const fileItem: FileItem = {
    path: relativePath,
    type,
    name,
  };

  if (includeMetadata) {
    try {
      const fs = await import('fs/promises');
      const stat = await fs.stat(fullPath);
      fileItem.metadata = {
        size: type === 'file' ? stat.size : 0,
        lastModified: stat.mtime.toISOString(),
        isHidden,
      };
    } catch (error) {
      debug(`Failed to get ${type} metadata: ${fullPath}`, error);
    }
  }

  return fileItem;
}

function shouldIncludeFileOrFolder(
  path: string,
  searchString?: string,
): boolean {
  return (
    !searchString || path.toLowerCase().includes(searchString.toLowerCase())
  );
}

function shouldIgnorePath(
  fullPath: string,
  name: string,
  ignorePatterns: RegExp[],
): boolean {
  if (name.startsWith('.')) {
    return true;
  }

  return ignorePatterns.some((pattern) => pattern.test(fullPath));
}

async function recursiveWalk(
  dir: string,
  context: WalkContext,
  currentItemCount: number = 0,
) {
  if (currentItemCount > context.maxSize) {
    return [];
  }

  const items: FileItem[] = [];
  const { cwd, ignorePatterns, includeMetadata, maxSize } = context;
  try {
    const fs = await import('fs/promises');
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (items.length + currentItemCount > maxSize) {
        break;
      }

      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(cwd, fullPath);
      const name = entry.name;
      const isHidden = name.startsWith('.');
      if (shouldIgnorePath(fullPath, name, ignorePatterns)) {
        continue;
      }

      if (entry.isFile()) {
        if (shouldIncludeFileOrFolder(relativePath, context.searchString)) {
          const fileItem = await createFileItem(
            fullPath,
            relativePath,
            name,
            'file',
            includeMetadata,
            isHidden,
          );

          items.push(fileItem);
        }
      } else if (entry.isDirectory()) {
        if (shouldIncludeFileOrFolder(relativePath, context.searchString)) {
          const folderItem = await createFileItem(
            fullPath,
            relativePath,
            name,
            'directory',
            includeMetadata,
            isHidden,
          );
          items.push(folderItem);
        }

        const subItems = await recursiveWalk(
          fullPath,
          context,
          currentItemCount + items.length,
        );

        items.push(...subItems);
      }
    }

    return items;
  } catch (e) {
    debug(`Error walking directory: ${dir}`, e);
    return [];
  }
}

async function getGitStatusItems(
  cwd: string,
  includeMetadata: boolean,
  searchString?: string,
) {
  const gitStatus = await (async () => {
    // won't throw error
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['status', '--short'],
      undefined,
      undefined,
      false,
    );
    // DO NOT USE TRIM HERE, it will make the result inconsistent
    return stdout;
  })();

  const files = gitStatus
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .filter(
      (line) =>
        !line.startsWith('D') &&
        !line.startsWith('??') &&
        !line.startsWith('R'),
    )
    .map((line) => line.slice(3))
    .filter(
      (path) =>
        !searchString ||
        path.toLowerCase().includes(searchString.toLowerCase()),
    );

  return Promise.all(
    files.map(async (file) => {
      const fullPath = path.join(cwd, file);
      const relativePath = path.relative(cwd, fullPath);
      const name = path.basename(file);
      const isHidden = name.startsWith('.');
      const item = await createFileItem(
        fullPath,
        relativePath,
        name,
        'file',
        includeMetadata,
        isHidden,
      );

      return item;
    }),
  );
}

function sortItems(items: FileItem[]): FileItem[] {
  return items.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }

    return a.path.localeCompare(b.path);
  });
}

function separateItemsByType(items: FileItem[]) {
  const files = items.filter((item) => item.type === 'file');
  const directories = items.filter((item) => item.type === 'directory');

  return {
    files: files.map((item) => item.path),
    directories: directories.map((item) => item.path),
  };
}

const filesRoute: FastifyPluginAsync<CreateServerOpts> = async (app, opts) => {
  app.get<{ Querystring: FileListRequest }>(
    '/files/list',
    {
      schema: {
        querystring: FileListRequestSchema,
      },
    },
    async (request, reply) => {
      try {
        const cwd = opts.context.cwd;
        const params = normalizeRequestParams(request.query, cwd);

        const validation = await validateDirectory(params.targetDir);
        if (!validation.isValid) {
          return reply
            .code(validation.error?.includes('not exist') ? 404 : 400)
            .send({
              success: false,
              error: validation.error,
            });
        }

        const gitStatusItems = await getGitStatusItems(
          cwd,
          params.includeMetadata,
          params.searchString,
        );

        let targetItems: FileItem[] = gitStatusItems.slice(0, params.maxSize);

        if (targetItems.length < params.maxSize) {
          const remainingSize = params.maxSize - gitStatusItems.length;

          const context: WalkContext = {
            cwd,
            ignorePatterns: loadIgnorePatterns(cwd),
            maxSize: remainingSize,
            searchString: params.searchString,
            includeMetadata: params.includeMetadata,
          };

          const items = await recursiveWalk(params.targetDir, context);

          targetItems = [...targetItems, ...sortItems(items)];
        }

        const { files, directories } = separateItemsByType(targetItems);

        return reply.send({
          success: true,
          data: {
            cwd,
            directory: params.targetDir,
            items: targetItems,
            files,
            directories,
          },
        });
      } catch (error) {
        debug(`File list API error:`, error);

        return reply.code(500).send({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while getting file list',
        });
      }
    },
  );

  app.get<{ Querystring: { filePath: string } }>(
    '/files/read',
    {
      schema: {
        querystring: FileReadRequestSchema,
      },
    },
    async (request, reply) => {
      try {
        const { filePath } = request.query;
        const cwd = opts.context.cwd;
        const absolutePath = path.resolve(cwd, filePath);

        if (!absolutePath.startsWith(cwd)) {
          return reply.code(400).send({
            success: false,
            error: 'File path is outside of the project directory.',
          });
        }

        const content = await fs.readFile(absolutePath, 'utf-8');

        return reply.send({
          success: true,
          data: {
            content,
            filePath,
          },
        });
      } catch (error: any) {
        debug(`File read API error:`, error);
        if (error.code === 'ENOENT') {
          return reply.code(404).send({
            success: false,
            message: 'File not found.',
          });
        }
        return reply.code(500).send({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while reading file.',
        });
      }
    },
  );

  app.post<{ Body: FileEditRequest }>(
    '/files/edit',
    {
      schema: {
        body: FileEditRequestSchema,
      },
    },
    async (request, reply) => {
      try {
        const { filePath, content } = request.body;
        const cwd = opts.context.cwd;
        const absolutePath = path.resolve(cwd, filePath);

        if (!absolutePath.startsWith(cwd)) {
          return reply.code(400).send({
            success: false,
            error: 'File path is outside of the project directory.',
          });
        }

        await fs.writeFile(absolutePath, content, 'utf-8');

        return reply.send({
          success: true,
          data: {
            message: 'File updated successfully.',
            filePath,
          },
        });
      } catch (error) {
        debug(`File edit API error:`, error);
        return reply.code(500).send({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while editing file.',
        });
      }
    },
  );
};

export default filesRoute;
