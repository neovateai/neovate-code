import { tool } from '@openai/agents';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
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

const MAX_WIDTH = 2000;
const MAX_HEIGHT = 2000;
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
  const mime_type = getImageMimeType(ext);
  return {
    success: true,
    message: 'Read image file successfully.',
    mimeType: mime_type,
    type: 'image',
    data: buffer.toString('base64'),
  };
}

async function processImage(filePath: string): Promise<any> {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // For SVG files, read as text since they don't need processing
    if (ext === '.svg') {
      const buffer = fs.readFileSync(filePath);
      return createImageResponse(buffer, ext);
    }

    const image = sharp(fs.readFileSync(filePath));
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      if (stats.size > MAX_IMAGE_SIZE) {
        const compressedBuffer = await image.jpeg({ quality: 80 }).toBuffer();
        return createImageResponse(compressedBuffer, '.jpeg');
      }
    }

    let width = metadata.width || 0;
    let height = metadata.height || 0;

    // Check if the original file works as-is
    if (
      stats.size <= MAX_IMAGE_SIZE &&
      width <= MAX_WIDTH &&
      height <= MAX_HEIGHT
    ) {
      return createImageResponse(fs.readFileSync(filePath), ext);
    }

    // Calculate new dimensions while maintaining aspect ratio
    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }

    if (height > MAX_HEIGHT) {
      width = Math.round((width * MAX_HEIGHT) / height);
      height = MAX_HEIGHT;
    }

    // Resize image
    const resizedImageBuffer = await image
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    // If still too large after resize, compress quality
    if (resizedImageBuffer.length > MAX_IMAGE_SIZE) {
      const compressedBuffer = await image.jpeg({ quality: 80 }).toBuffer();
      return createImageResponse(compressedBuffer, '.jpeg');
    }

    return createImageResponse(resizedImageBuffer, ext);
  } catch (error) {
    // Fallback: try to return original image if size allows
    const buffer = fs.readFileSync(filePath);
    if (buffer.length <= MAX_IMAGE_SIZE) {
      return createImageResponse(buffer, path.extname(filePath));
    } else {
      throw error;
    }
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
