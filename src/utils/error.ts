import { TOOL_NAMES } from '../constants';

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
    super(
      `File content (${fileLength} characters) exceeds maximum allowed length (${maxFileLength} characters). Please use offset and limit parameters to read specific portions of the file, or use the ${TOOL_NAMES.GREP} tool to search for specific content.`,
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
      `File content (${tokenCount} tokens) exceeds maximum allowed tokens (${maxTokens}). Please use offset and limit parameters to read specific portions of the file, or use the ${TOOL_NAMES.GREP} tool to search for specific content.`,
    );
    this.name = 'MaxFileReadTokenExceededError';
    this.maxTokens = maxTokens;
    this.tokenCount = tokenCount;
  }
}
