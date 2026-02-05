import fs from 'fs';
import path from 'pathe';
import { TOOL_NAMES } from '../constants';
import { createTool, type ToolResult } from '../tool';
import { MaxFileReadLengthExceededError } from '../utils/error';
import {
  MAX_FILE_LENGTH,
  MAX_LINES_TO_READ,
  checkFileType,
  createEmptyFileResult,
  createReadResult,
  estimatePartialReadSize,
  getReadToolDescription,
  isImageFile,
  processFileContent,
  processImage,
  readToolParameters,
  resolveFilePath,
  validateAndTruncateContent,
  validateFileSize,
  validateReadParams,
} from './read.shared';

export function createReadTool(opts: { cwd: string; productName: string }) {
  return createTool({
    name: TOOL_NAMES.READ,
    description: getReadToolDescription(opts.productName),
    parameters: readToolParameters,
    getDescription: ({ params, cwd }) => {
      if (!params.file_path || typeof params.file_path !== 'string') {
        return 'No file path provided';
      }
      return path.relative(cwd, params.file_path);
    },
    execute: async ({ file_path, offset, limit }) => {
      try {
        validateReadParams(offset, limit);

        const ext = path.extname(file_path).toLowerCase();
        checkFileType(ext, file_path);

        const fullFilePath = resolveFilePath(file_path, opts.cwd);

        // Get file stats once and reuse throughout
        const stats = fs.statSync(fullFilePath);

        // Level 1: Pre-check validation
        const isPartialRead = offset !== undefined || limit !== undefined;

        if (!isImageFile(ext)) {
          if (isPartialRead) {
            // For partial reads, estimate the size of content that will be read
            const estimatedSize = estimatePartialReadSize(
              fullFilePath,
              limit ?? MAX_LINES_TO_READ,
            );

            // If we can estimate and it's too large, fail fast
            if (estimatedSize !== null && estimatedSize > MAX_FILE_LENGTH) {
              throw new MaxFileReadLengthExceededError(
                estimatedSize,
                MAX_FILE_LENGTH,
              );
            }
          } else {
            // For full file reads, check the actual file size
            if (!validateFileSize(fullFilePath, MAX_FILE_LENGTH)) {
              throw new MaxFileReadLengthExceededError(
                stats.size,
                MAX_FILE_LENGTH,
              );
            }
          }
        }

        // Handle image files
        if (isImageFile(ext)) {
          return await processImage(fullFilePath, opts.cwd);
        }

        // Check if empty
        if (stats.size === 0) {
          return createEmptyFileResult(file_path);
        }

        // Read text file using fs
        const fileContent = fs.readFileSync(fullFilePath, { encoding: 'utf8' });
        if (fileContent === undefined || fileContent === null) {
          throw new Error(`Failed to read file: ${file_path}`);
        }

        // Process content
        const {
          content,
          totalLines,
          startLine,
          endLine,
          actualLimit,
          selectedLines,
        } = processFileContent(
          fileContent,
          offset ?? 1,
          limit ?? MAX_LINES_TO_READ,
        );

        // Validate and truncate (now synchronous with Level 2 & 3 validation)
        const { processedContent, actualLinesRead } =
          validateAndTruncateContent(content, selectedLines);

        return createReadResult(
          file_path,
          processedContent,
          totalLines,
          startLine,
          endLine,
          actualLimit,
          actualLinesRead,
          offset,
          limit,
        );
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
