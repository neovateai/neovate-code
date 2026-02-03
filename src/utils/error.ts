import { TOOL_NAMES } from '../constants';

/**
 * Format bytes to human-readable size string
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "256KB", "1.5MB")
 */
function formatBytes(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1) return `${bytes} bytes`;
  if (kb < 1024) return `${kb.toFixed(1).replace(/\.0$/, '')}KB`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1).replace(/\.0$/, '')}MB`;

  const gb = mb / 1024;
  return `${gb.toFixed(1).replace(/\.0$/, '')}GB`;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return String(error);
  } catch {
    return 'Failed to get error details';
  }
}

export class MaxFileReadLengthExceededError extends Error {
  public readonly maxFileLength: number;
  public readonly fileLength: number;
  constructor(fileLength: number, maxFileLength: number) {
    const actualSizeStr = formatBytes(fileLength);
    const maxSizeStr = formatBytes(maxFileLength);

    super(
      `File content (${actualSizeStr}) exceeds maximum allowed size (${maxSizeStr}). ` +
        `Please use offset and limit parameters to read specific portions of the file, ` +
        `or use the ${TOOL_NAMES.GREP} tool to search for specific content.`,
    );
    this.name = 'MaxFileReadLengthExceededError';
    this.maxFileLength = maxFileLength;
    this.fileLength = fileLength;
  }
}

export class MaxFileReadTokenExceededError extends Error {
  public readonly maxTokens: number;
  public readonly tokenCount: number;
  constructor(tokenCount: number, maxTokens: number) {
    super(
      `File content (${tokenCount} tokens) exceeds maximum allowed tokens (${maxTokens}). ` +
        `Please use offset and limit parameters to read specific portions of the file, ` +
        `or use the ${TOOL_NAMES.GREP} tool to search for specific content.`,
    );
    this.name = 'MaxFileReadTokenExceededError';
    this.maxTokens = maxTokens;
    this.tokenCount = tokenCount;
  }
}
