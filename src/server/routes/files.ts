import { Type } from '@sinclair/typebox';
import createDebug from 'debug';
import { FastifyPluginAsync } from 'fastify';
import path from 'path';
import { loadIgnorePatterns } from '../context/context-files';
import { CreateServerOpts } from '../types';
import { FileItem, FileListRequest } from '../types/files';

const debug = createDebug('takumi:server:files');

const FileListRequestSchema = Type.Object({
  directory: Type.Optional(Type.String()),
  pattern: Type.Optional(Type.String()),
  maxDepth: Type.Optional(Type.Number()),
  includeMetadata: Type.Optional(Type.Number()),
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
const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_INCLUDE_METADATA = 0;

interface WalkContext {
  cwd: string;
  ignorePatterns: RegExp[];
  pattern?: RegExp;
  includeMetadata: boolean;
  maxDepth: number;
}

function normalizeRequestParams(query: FileListRequest, cwd: string) {
  const {
    directory = DEFAULT_DIRECTORY,
    pattern,
    maxDepth = DEFAULT_MAX_DEPTH,
    includeMetadata = DEFAULT_INCLUDE_METADATA,
  } = query;

  return {
    directory,
    pattern: pattern ? new RegExp(pattern, 'i') : undefined,
    maxDepth,
    includeMetadata: includeMetadata === 1,
    targetDir: path.resolve(cwd, directory),
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

function shouldIncludeFile(name: string, pattern?: RegExp): boolean {
  return !pattern || pattern.test(name);
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

async function walkDirectory(
  dir: string,
  context: WalkContext,
  currentDepth: number = 0,
): Promise<FileItem[]> {
  if (currentDepth > context.maxDepth) {
    return [];
  }

  const items: FileItem[] = [];

  try {
    const fs = await import('fs/promises');
    const entries = await fs.readdir(dir, { withFileTypes: true });

    // 并行处理所有条目
    const processPromises = entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(context.cwd, fullPath);

      // 检查是否应该忽略
      if (shouldIgnorePath(fullPath, entry.name, context.ignorePatterns)) {
        return null;
      }

      const isHidden = entry.name.startsWith('.');

      if (entry.isFile()) {
        // 检查文件模式匹配
        if (!shouldIncludeFile(entry.name, context.pattern)) {
          return null;
        }

        return createFileItem(
          fullPath,
          relativePath,
          entry.name,
          'file',
          context.includeMetadata,
          isHidden,
        );
      } else if (entry.isDirectory()) {
        const folderItem = await createFileItem(
          fullPath,
          relativePath,
          entry.name,
          'directory',
          context.includeMetadata,
          isHidden,
        );

        // 递归遍历子目录
        const subItems = await walkDirectory(
          fullPath,
          context,
          currentDepth + 1,
        );

        return [folderItem, ...subItems];
      }

      return null;
    });

    const results = await Promise.all(processPromises);

    // 扁平化结果并过滤 null 值
    for (const result of results) {
      if (result) {
        if (Array.isArray(result)) {
          items.push(...result);
        } else {
          items.push(result);
        }
      }
    }
  } catch (error) {
    debug(`Error walking directory: ${dir}`, error);
  }

  return items;
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

        const context: WalkContext = {
          cwd,
          ignorePatterns: loadIgnorePatterns(cwd),
          pattern: params.pattern,
          includeMetadata: params.includeMetadata,
          maxDepth: params.maxDepth,
        };

        const items = await walkDirectory(params.targetDir, context);

        const sortedItems = sortItems(items);
        const { files, directories } = separateItemsByType(sortedItems);

        return reply.send({
          success: true,
          data: {
            cwd,
            directory: params.targetDir,
            items: sortedItems,
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

        const fs = await import('fs/promises');
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

        const fs = await import('fs/promises');
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
