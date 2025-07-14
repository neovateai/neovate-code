import { tool } from '@openai/agents';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { IMAGE_EXTENSIONS } from '../constants';
import { Context } from '../context';
import { EnhancedTool, enhanceTool } from '../tool';

type ImageMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'image/bmp'
  | 'image/svg+xml'
  | 'image/tiff';

const MAX_IMAGE_SIZE = 3.75 * 1024 * 1024; // 3.75MB in bytes

function getImageMimeType(filePath: string): ImageMediaType {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, ImageMediaType> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

function createImageResponse(buffer: Buffer, ext: string) {
  const mimeType = getImageMimeType(ext);
  return {
    success: true,
    message: 'Read image file successfully.',
    mimeType,
    type: 'image',
    data: buffer.toString('base64'),
  };
}

async function processImage(filePath: string): Promise<any> {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Security: Validate file path to prevent traversal attacks
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(process.cwd())) {
      throw new Error('Invalid file path: path traversal detected');
    }

    const buffer = fs.readFileSync(filePath);

    // If file is within size limit, return as-is
    if (stats.size <= MAX_IMAGE_SIZE) {
      return createImageResponse(buffer, ext);
    }

    // If file is too large, return error with helpful message
    throw new Error(
      `Image file is too large (${Math.round((stats.size / 1024 / 1024) * 100) / 100}MB). ` +
        `Maximum supported size is ${Math.round((MAX_IMAGE_SIZE / 1024 / 1024) * 100) / 100}MB. ` +
        `Please resize the image and try again.`,
    );
  } catch (error) {
    throw error;
  }
}

export function createReadTool(opts: { context: Context }): EnhancedTool {
  return enhanceTool(
    tool({
      name: 'read',
      description: 'Read a file from the local filesystem',
      parameters: z.object({
        file_path: z.string(),
      }),
      execute: async ({ file_path }) => {
        try {
          const ext = path.extname(file_path).toLowerCase();
          const fullFilePath = path.isAbsolute(file_path)
            ? file_path
            : path.resolve(opts.context.cwd, file_path);

          if (!fs.existsSync(fullFilePath)) {
            throw new Error(`File ${fullFilePath} does not exist.`);
          }

          // Handle image files
          if (IMAGE_EXTENSIONS.has(ext)) {
            const result = await processImage(fullFilePath);
            return result;
          }

          // Handle text files
          const content = fs.readFileSync(fullFilePath, 'utf-8');
          return {
            success: true,
            message: `Read ${content.split('\n').length} lines.`,
            type: 'text',
            data: {
              filePath: file_path,
              content,
              totalLines: content.split('\n').length,
            },
          };
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e.message : 'Unknown error',
          };
        }
      },
    }),
    {
      category: 'read',
      riskLevel: 'low',
    },
  );
}
