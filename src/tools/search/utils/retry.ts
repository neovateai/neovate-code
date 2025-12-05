/**
 * Retry utility with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    baseDelay?: number;
    maxDelay?: number;
  },
): Promise<T> {
  const { maxRetries, baseDelay = 1000, maxDelay = 10000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on the last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Don't retry on certain errors
      if (isNonRetryableError(lastError)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Check if error should not be retried
 */
function isNonRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Don't retry validation errors
  if (
    message.includes('api key is required') ||
    message.includes('query cannot be empty') ||
    message.includes('query too long') ||
    message.includes('invalid')
  ) {
    return true;
  }

  // Don't retry 4xx errors (except 429 rate limit)
  if (message.includes('http 4') && !message.includes('429')) {
    return true;
  }

  return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
