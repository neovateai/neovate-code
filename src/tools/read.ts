import fs from 'fs';
import path from 'pathe';
import { z } from 'zod';
import { IMAGE_EXTENSIONS } from '../constants';
import { createTool, type ToolResult } from '../tool';
import { safeStringify } from '../utils/safeStringify';

type ImageMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'image/bmp'
  | 'image/svg+xml'
  | 'image/tiff';

const MAX_IMAGE_SIZE = 3.75 * 1024 * 1024; // 3.75MB in bytes

function getImageMimeType(ext: string): ImageMediaType {
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

function createImageResponse(buffer: Buffer, ext: string): ToolResult {
  const mimeType = getImageMimeType(ext);
  const base64 = buffer.toString('base64');
  const data = `data:${mimeType};base64,${base64}`;
  return {
    llmContent: [{ type: 'image', data, mimeType }],
    returnDisplay: 'Read image file successfully.',
  };
}

async function processImage(filePath: string): Promise<ToolResult> {
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

const MAX_LINES_TO_READ = 2000;
const MAX_LINE_LENGTH = 2000;

export function createReadTool(opts: { cwd: string; productName: string }) {
  const productName = opts.productName.toLowerCase();
  return createTool({
    name: 'read',
    description: `
Reads a file from the local filesystem. You can access any file directly by using this tool.

Usage:
- By default, it reads up to ${MAX_LINES_TO_READ} lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated
- This tool allows ${productName} to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as ${productName} is a multimodal LLM.
      `,
    parameters: z.object({
      file_path: z.string().describe('The absolute path to the file to read'),
      offset: z
        .number()
        .optional()
        .nullable()
        .describe(
          'The line number to start reading from. Only provide if the file is too large to read at once',
        ),
      limit: z
        .number()
        .optional()
        .nullable()
        .describe(
          `The number of lines to read. Only provide if the file is too large to read at once`,
        ),
    }),
    getDescription: ({ params, cwd }) => {
      if (!params.file_path || typeof params.file_path !== 'string') {
        return 'No file path provided';
      }
      return path.relative(cwd, params.file_path);
    },
    execute: async ({ file_path, offset, limit }) => {
      try {
        // Validate parameters
        if (offset !== undefined && offset !== null && offset < 1) {
          throw new Error('Offset must be >= 1');
        }
        if (limit !== undefined && limit !== null && limit < 1) {
          throw new Error('Limit must be >= 1');
        }

        const ext = path.extname(file_path).toLowerCase();

        const fullFilePath = (() => {
          if (path.isAbsolute(file_path)) {
            return file_path;
          }
          const full = path.resolve(opts.cwd, file_path);
          if (fs.existsSync(full)) {
            return full;
          }
          if (file_path.startsWith('@')) {
            const full = path.resolve(opts.cwd, file_path.slice(1));
            if (fs.existsSync(full)) {
              return full;
            }
          }
          throw new Error(`File ${file_path} does not exist.`);
        })();

        // Handle image files
        if (IMAGE_EXTENSIONS.has(ext)) {
          const result = await processImage(fullFilePath);
          return result;
        }

        // Handle text files
        const content = fs.readFileSync(fullFilePath, 'utf-8');
        const allLines = content.split(/\r?\n/);
        const totalLines = allLines.length;

        // Apply offset and limit with defaults
        const actualOffset = offset ?? 1;
        const actualLimit = limit ?? MAX_LINES_TO_READ;
        const startLine = Math.max(0, actualOffset - 1); // Convert 1-based to 0-based
        const endLine = Math.min(totalLines, startLine + actualLimit);
        const selectedLines = allLines.slice(startLine, endLine);

        // Truncate long lines
        const truncatedLines = selectedLines.map((line) =>
          line.length > MAX_LINE_LENGTH
            ? line.substring(0, MAX_LINE_LENGTH) + '...'
            : line,
        );

        const processedContent = truncatedLines.join('\n');
        const actualLinesRead = selectedLines.length;

        return {
          returnDisplay:
            offset !== undefined || limit !== undefined
              ? `Read ${actualLinesRead} lines (from line ${startLine + 1} to ${endLine}).`
              : `Read ${actualLinesRead} lines.`,
          llmContent: safeStringify({
            type: 'text',
            filePath: file_path,
            content: processedContent,
            totalLines,
            offset: startLine + 1, // Convert back to 1-based
            limit: actualLimit,
            actualLinesRead,
          }),
        };
      } catch (e) {
        return {
          isError: true,
          llmContent: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
    approval: {
      category: 'read',
    },
  });
}
