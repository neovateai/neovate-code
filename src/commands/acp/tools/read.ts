/**
 * ACP Read Tool - Read files using ACP protocol
 *
 * Reuses all logic from read.shared.ts, only customizes file reading method.
 *
 * Graceful Degradation:
 * - Tries ACP protocol first
 * - Falls back to fs if ACP is unavailable or fails
 */

import type { AgentSideConnection } from '@agentclientprotocol/sdk';
import fs from 'fs';
import path from 'pathe';
import { TOOL_NAMES } from '../../../constants';
import { createTool } from '../../../tool';
import {
  checkFileType,
  createEmptyFileResult,
  createReadResult,
  getReadToolDescription,
  isImageFile,
  MAX_LINES_TO_READ,
  processFileContent,
  processImage,
  readToolParameters,
  resolveFilePath,
  validateAndTruncateContent,
  validateReadParams,
} from '../../../tools/read.shared';

export function createReadTool(opts: {
  cwd: string;
  productName: string;
  connection: AgentSideConnection;
  sessionId: string;
}) {
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

        // Handle image files (still use fs for binary)
        if (isImageFile(ext)) {
          return await processImage(fullFilePath, opts.cwd);
        }

        // Check if empty (use fs for sync stat)
        const stats = fs.statSync(fullFilePath);
        if (stats.size === 0) {
          return createEmptyFileResult(file_path);
        }

        // Try ACP protocol first, fallback to fs
        let fileContent: string;
        try {
          const readResult = await opts.connection.readTextFile({
            path: fullFilePath,
            sessionId: opts.sessionId,
          });

          if (readResult.content === undefined || readResult.content === null) {
            throw new Error('ACP returned empty content');
          }

          fileContent = readResult.content;
          // Success! Using ACP protocol
        } catch (acpError) {
          // ACP failed, fallback to fs
          console.warn(
            `[ACP Read] Failed to read via ACP, falling back to fs: ${acpError instanceof Error ? acpError.message : 'Unknown error'}`,
          );

          try {
            fileContent = fs.readFileSync(fullFilePath, { encoding: 'utf8' });
          } catch (fsError) {
            // Both ACP and fs failed
            throw new Error(
              `Failed to read file via ACP and fs: ${fsError instanceof Error ? fsError.message : 'Unknown error'}`,
            );
          }
        }

        if (fileContent === undefined || fileContent === null) {
          throw new Error(`Failed to read file: ${file_path}`);
        }

        // Process content (shared logic)
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

        // Validate and truncate (shared logic - now synchronous)
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
