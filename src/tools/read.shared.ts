/**
 * Read Tool - Shared logic and utilities
 *
 * This file contains reusable functions for reading files,
 * allowing both fs-based and ACP-based implementations to share code.
 */

import fs from 'fs';
import { countTokens } from 'gpt-tokenizer';
import path from 'pathe';
import { z } from 'zod';
import { BINARY_EXTENSIONS, IMAGE_EXTENSIONS, TOOL_NAMES } from '../constants';
import { type ToolResult } from '../tool';
import {
  MaxFileReadLengthExceededError,
  MaxFileReadTokenExceededError,
} from '../utils/error';
import { safeStringify } from '../utils/safeStringify';

// Constants
export const MAX_LINES_TO_READ = 2000;
export const MAX_LINE_LENGTH = 2000;
export const MAX_FILE_LENGTH = 262144;
export const MAX_TOKENS = 25000;
const MAX_IMAGE_SIZE = 3.75 * 1024 * 1024;

type ImageMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'image/bmp'
  | 'image/svg+xml'
  | 'image/tiff';

// Image handling
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

export async function processImage(
  filePath: string,
  cwd: string,
): Promise<ToolResult> {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const resolvedPath = path.resolve(filePath);
    const normalizedCwd = path.resolve(cwd);
    if (!resolvedPath.startsWith(normalizedCwd)) {
      throw new Error('Invalid file path: path traversal detected');
    }

    const buffer = fs.readFileSync(filePath);

    if (stats.size <= MAX_IMAGE_SIZE) {
      return createImageResponse(buffer, ext);
    }

    throw new Error(
      `Image file is too large (${Math.round((stats.size / 1024 / 1024) * 100) / 100}MB). ` +
        `Maximum supported size is ${Math.round((MAX_IMAGE_SIZE / 1024 / 1024) * 100) / 100}MB. ` +
        `Please resize the image and try again.`,
    );
  } catch (error) {
    throw error;
  }
}

// Path resolution
export function resolveFilePath(filePath: string, cwd: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  const full = path.resolve(cwd, filePath);
  if (fs.existsSync(full)) {
    return full;
  }
  if (filePath.startsWith('@')) {
    const full = path.resolve(cwd, filePath.slice(1));
    if (fs.existsSync(full)) {
      return full;
    }
  }
  throw new Error(`File ${filePath} does not exist.`);
}

// File content processing
export function processFileContent(
  fileContent: string,
  offset: number,
  limit: number,
): {
  content: string;
  totalLines: number;
  startLine: number;
  endLine: number;
  actualLimit: number;
  selectedLines: string[];
} {
  const allLines = fileContent.split(/\r?\n/);
  const totalLines = allLines.length;

  const actualOffset = offset ?? 1;
  const actualLimit = limit ?? MAX_LINES_TO_READ;
  const startLine = Math.max(0, actualOffset - 1);
  const endLine = Math.min(totalLines, startLine + actualLimit);
  const selectedLines = allLines.slice(startLine, endLine);

  return {
    content: selectedLines.join('\n'),
    totalLines,
    startLine,
    endLine,
    actualLimit,
    selectedLines,
  };
}

// Content validation and truncation
export function validateAndTruncateContent(
  content: string,
  selectedLines: string[],
): {
  processedContent: string;
  actualLinesRead: number;
} {
  // Level 2: Content length validation
  if (content.length > MAX_FILE_LENGTH) {
    throw new MaxFileReadLengthExceededError(content.length, MAX_FILE_LENGTH);
  }

  // Level 3: Progressive token validation
  validateTokenCount(content, MAX_TOKENS);

  const truncatedLines = selectedLines.map((line) =>
    line.length > MAX_LINE_LENGTH
      ? `${line.substring(0, MAX_LINE_LENGTH)}...`
      : line,
  );

  return {
    processedContent: truncatedLines.join('\n'),
    actualLinesRead: selectedLines.length,
  };
}

// Tool parameters
export const readToolParameters = z.object({
  file_path: z.string().describe('The absolute path to the file to read'),
  offset: z
    .number()
    .optional()
    .describe(
      'The line number to start reading from. Only provide if the file is too large to read at once',
    ),
  limit: z
    .number()
    .optional()
    .describe(
      `The number of lines to read. Only provide if the file is too large to read at once`,
    ),
});

// Tool description
export function getReadToolDescription(productName: string): string {
  const lowerProductName = productName.toLowerCase();
  return `
Reads a file from the local filesystem. You can access any file directly by using this tool.
Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:
- The file_path parameter must be an absolute path, not a relative path
- By default, it reads up to ${MAX_LINES_TO_READ} lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated
- This tool allows ${lowerProductName} to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as ${lowerProductName} is a multimodal LLM.
- This tool can only read files, not directories. To read a directory, use the ${TOOL_NAMES.LS} tool.
- You can call multiple tools in a single response. It is always better to speculatively read multiple potentially useful files in parallel.
- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.
      `;
}

// Validation
export function validateReadParams(offset?: number, limit?: number): void {
  if (offset !== undefined && offset !== null && offset < 1) {
    throw new Error('Offset must be >= 1');
  }
  if (limit !== undefined && limit !== null && limit < 1) {
    throw new Error('Limit must be >= 1');
  }
}

// Create result
export function createReadResult(
  file_path: string,
  processedContent: string,
  totalLines: number,
  startLine: number,
  endLine: number,
  actualLimit: number,
  actualLinesRead: number,
  offset?: number,
  limit?: number,
): ToolResult {
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
      offset: startLine + 1,
      limit: actualLimit,
      actualLinesRead,
    }),
  };
}

// Empty file result
export function createEmptyFileResult(file_path: string): ToolResult {
  return {
    returnDisplay: 'File is empty.',
    llmContent: safeStringify({
      type: 'text',
      filePath: file_path,
      content: '',
      totalLines: 0,
      offset: 1,
      limit: 0,
      actualLinesRead: 0,
    }),
  };
}

// Check file type
export function checkFileType(ext: string, filePath: string): void {
  if ('.pdf' === ext) {
    throw new Error('PDF files are not supported yet');
  }

  if (BINARY_EXTENSIONS.has(ext)) {
    throw new Error(
      `Cannot read file "${path.basename(filePath)}": Extension "${ext}" is restricted as a binary/system file.`,
    );
  }
}

// Check if image
export function isImageFile(ext: string): boolean {
  return IMAGE_EXTENSIONS.has(ext);
}

/**
 * Level 1: Pre-check validation - Check if file size exceeds limit
 * @param filePath - Path to the file to check
 * @param maxSize - Maximum allowed file size in bytes (default: MAX_FILE_LENGTH)
 * @returns true if file size is within limit, false otherwise
 */
export function validateFileSize(
  filePath: string,
  maxSize: number = MAX_FILE_LENGTH,
): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.size <= maxSize;
  } catch {
    return false; // File doesn't exist or no permission
  }
}

/**
 * Estimate the size of content that will be read based on limit
 * This helps prevent reading large files into memory when only a small portion is needed
 * @param filePath - Path to the file
 * @param limit - Number of lines to read
 * @returns Estimated size in bytes, or null if estimation is not reliable
 */
export function estimatePartialReadSize(
  filePath: string,
  limit: number,
): number | null {
  try {
    const stats = fs.statSync(filePath);

    // If file is already small enough, no need to estimate
    if (stats.size <= MAX_FILE_LENGTH) {
      return stats.size;
    }

    // For partial reads, estimate average line length
    // This is a heuristic: assume uniform line distribution
    // Read a small sample from the beginning to estimate line length
    const sampleSize = Math.min(stats.size, 8192); // Read first 8KB for sampling
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(sampleSize);
    fs.readSync(fd, buffer, 0, sampleSize, 0);
    fs.closeSync(fd);

    const sampleText = buffer.toString('utf8');
    const sampleLines = sampleText.split(/\r?\n/);
    const avgLineLength = sampleSize / sampleLines.length;

    // Estimate total size of the partial read
    // Add some buffer (20%) for safety since line lengths may vary
    const estimatedSize = Math.ceil(avgLineLength * limit * 1.2);

    return estimatedSize;
  } catch {
    return null; // Cannot estimate, let normal validation handle it
  }
}

/**
 * Level 3: Progressive token validation
 * Uses fast estimation + conditional precise counting strategy
 * @param content - Content to validate
 * @param maxTokens - Maximum allowed tokens (default: MAX_TOKENS)
 */
export function validateTokenCount(
  content: string,
  maxTokens: number = MAX_TOKENS,
): void {
  // Step 1: Fast estimation (chars / 4)
  const estimatedTokens = content.length / 4;

  // Step 2: If below 25% threshold, skip precise counting
  const threshold = maxTokens / 4; // 6250 tokens
  if (estimatedTokens <= threshold) {
    return; // Performance optimization: small files skip counting
  }

  // Step 3: Precise token counting
  const actualTokens = countTokens(content);
  if (actualTokens > maxTokens) {
    throw new MaxFileReadTokenExceededError(actualTokens, maxTokens);
  }
}
