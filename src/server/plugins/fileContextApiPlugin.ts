import { FastifyInstance } from 'fastify';
import { loadIgnorePatterns } from '../../context/contextFiles';
import * as logger from '../../utils/logger';
import { ServerOptions } from '../types';

interface FileItem {
  path: string;
  absPath?: string;
  type: 'file' | 'directory';
  name: string;
  metadata?: {
    size: number;
    lastModified: string;
    isHidden: boolean;
  };
}

async function fileContextApiPlugin(
  fastify: FastifyInstance,
  opts: ServerOptions,
) {
  // 文件列表接口
  fastify.get<{
    Querystring: {
      directory?: string;
      pattern?: string;
      maxDepth?: number;
      includeMetadata?: number;
    };
  }>('/api/files/list', async (request, reply) => {
    try {
      const {
        directory = '.',
        pattern,
        maxDepth = 3,
        includeMetadata = 0,
      } = request.query;

      const cwd = opts.context.cwd;
      const path = await import('path');
      const fs = await import('fs/promises');

      const targetDir = path.resolve(cwd, directory);
      const maxDepthNum = maxDepth;

      try {
        const stat = await fs.stat(targetDir);
        if (!stat.isDirectory()) {
          return reply.code(400).send({
            success: false,
            error: 'The specified path is not a directory',
          });
        }
      } catch (error) {
        return reply.code(404).send({
          success: false,
          error: 'The specified path does not exist',
        });
      }

      // 递归获取文件和文件夹列表
      const ignorePatterns = loadIgnorePatterns(cwd);
      const items: Array<FileItem> = [];

      const includeMetadataBool = includeMetadata === 1;

      async function walkDirectory(dir: string, currentDepth: number) {
        if (currentDepth > maxDepthNum) return;

        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(cwd, fullPath);

            // 检查是否应该忽略
            if (ignorePatterns.some((pattern) => pattern.test(fullPath))) {
              continue;
            }

            // 处理隐藏文件/文件夹
            const isHidden = entry.name.startsWith('.');
            if (isHidden) {
              continue;
            }

            if (entry.isFile()) {
              // 应用模式匹配
              if (pattern) {
                const regex = new RegExp(pattern, 'i');
                if (!regex.test(entry.name)) {
                  continue;
                }
              }

              const fileItem: FileItem = {
                path: relativePath,
                // absPath: fullPath,
                type: 'file',
                name: entry.name,
              };

              if (includeMetadataBool) {
                try {
                  const stat = await fs.stat(fullPath);
                  fileItem.metadata = {
                    size: stat.size,
                    lastModified: stat.mtime.toISOString(),
                    isHidden,
                  };
                } catch (error) {
                  logger.logDebug(`Failed to get file metadata: ${fullPath}`);
                }
              }

              items.push(fileItem);
            } else if (entry.isDirectory()) {
              // 添加文件夹到列表中（如果启用）
              const folderItem: FileItem = {
                path: relativePath,
                // absPath: fullPath,
                type: 'directory',
                name: entry.name,
              };

              if (includeMetadataBool) {
                try {
                  const stat = await fs.stat(fullPath);
                  folderItem.metadata = {
                    size: 0, // 文件夹大小设为0
                    lastModified: stat.mtime.toISOString(),
                    isHidden,
                  };
                } catch (error) {
                  logger.logDebug(`Failed to get folder metadata: ${fullPath}`);
                }
              }

              items.push(folderItem);

              // 递归处理子目录
              await walkDirectory(fullPath, currentDepth + 1);
            }
          }
        } catch (error) {
          // 跳过无法访问的目录
          logger.logDebug(`Skipping inaccessible directory: ${dir}`);
        }
      }

      await walkDirectory(targetDir, 0);

      // 排序列表（先按类型，文件夹在前，然后按名称）
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      // 分离文件和文件夹以保持向后兼容性
      const files = items.filter((item) => item.type === 'file');
      const directories = items.filter((item) => item.type === 'directory');

      return reply.code(200).send({
        success: true,
        data: {
          cwd: cwd,
          directory: targetDir,
          items,
          files: files.map((item) => item.path),
          directories: directories.map((item) => item.path),
        },
      });
    } catch (error) {
      logger.logError({ error: `File list API error: ${error}` });

      return reply.code(500).send({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while getting file list',
      });
    }
  });
}

export { fileContextApiPlugin };
