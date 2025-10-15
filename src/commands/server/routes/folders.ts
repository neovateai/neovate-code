import { Type } from '@sinclair/typebox';
import createDebug from 'debug';
import type { FastifyPluginAsync } from 'fastify';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import path from 'pathe';
import type { ContextCreateOpts } from '../../../context';

const debug = createDebug('neovate:server:folders');

const hiddenPrefix = '.';
const isPlatformWindows = process.platform.indexOf('win') === 0;

interface FolderItem {
  name: string;
  path: string;
  isPackage: boolean;
  hidden: boolean;
  __typename: 'Folder';
}

interface FolderResponse {
  name: string;
  path: string;
  isPackage: boolean;
  children: FolderItem[];
  __typename: 'Folder';
}

const FolderListRequestSchema = Type.Object({
  path: Type.String(),
});

interface FolderListRequest {
  path: string;
}

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isDirectory();
  } catch (e) {
    if (process.env.DEBUG) debug('isDirectory error:', e);
    return false;
  }
}

async function isHidden(filePath: string): Promise<boolean> {
  try {
    const basename = path.basename(filePath);
    const prefixed = basename.charAt(0) === hiddenPrefix;

    if (isPlatformWindows) {
      // On Windows, check file attributes
      try {
        const stats = await fs.stat(filePath);
        // For now, just use the prefix check
        return prefixed;
      } catch (e) {
        return prefixed;
      }
    }

    return prefixed;
  } catch (e) {
    if (process.env.DEBUG) debug('isHidden error:', e);
    return false;
  }
}

function isPackage(folderPath: string): boolean {
  try {
    return fsSync.existsSync(path.join(folderPath, 'package.json'));
  } catch (e) {
    debug('isPackage error:', e);
    return false;
  }
}

async function listFolders(basePath: string): Promise<FolderItem[]> {
  try {
    const files = await fs.readdir(basePath, 'utf8');

    const folderPromises = files.map(async (file) => {
      const fullPath = path.join(basePath, file);

      const [isDir, hidden] = await Promise.all([
        isDirectory(fullPath),
        isHidden(fullPath),
      ]);

      if (!isDir) {
        return null;
      }

      const isPackageFolder = isPackage(fullPath);

      return {
        name: file,
        path: fullPath,
        isPackage: isPackageFolder,
        hidden,
        __typename: 'Folder' as const,
      };
    });

    const folders = await Promise.all(folderPromises);
    return folders.filter((folder): folder is FolderItem => folder !== null);
  } catch (e) {
    debug('listFolders error:', e);
    throw e;
  }
}

const foldersRoute: FastifyPluginAsync<ContextCreateOpts> = async (
  app,
  opts,
) => {
  // List folders endpoint
  app.get<{ Querystring: FolderListRequest }>(
    '/folders/list',
    {
      schema: {
        querystring: FolderListRequestSchema,
      },
    },
    async (request, reply) => {
      try {
        const { path: folderPath } = request.query;

        // Security check: ensure the path is accessible
        const absolutePath = path.resolve(folderPath);

        // Check if directory exists and is accessible
        const dirExists = await isDirectory(absolutePath);
        if (!dirExists) {
          return reply.code(404).send({
            success: false,
            message: 'Directory not found or not accessible.',
          });
        }

        const children = await listFolders(absolutePath);
        const isPackageFolder = isPackage(absolutePath);

        const response: FolderResponse = {
          name: path.basename(absolutePath) || absolutePath,
          path: absolutePath,
          isPackage: isPackageFolder,
          children,
          __typename: 'Folder',
        };

        return reply.send({
          success: true,
          data: response,
        });
      } catch (error) {
        debug('Folders list API error:', error);
        return reply.code(500).send({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while listing folders.',
        });
      }
    },
  );
};

export default foldersRoute;
