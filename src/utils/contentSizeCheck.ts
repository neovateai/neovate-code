/**
 * Checks if content exceeds a size limit and truncates if necessary
 */
export function checkContentSize(
  content: string,
  maxSizeBytes: number,
  addTruncationNote = true,
): {
  content: string;
  isTruncated: boolean;
  originalSizeKB: number;
} {
  const byteLength = Buffer.byteLength(content, 'utf-8');
  const originalSizeKB = byteLength / 1024;

  if (byteLength <= maxSizeBytes) {
    return { content, isTruncated: false, originalSizeKB };
  }

  // Truncate content if it exceeds the limit
  let truncatedContent = Buffer.from(content, 'utf-8')
    .subarray(0, maxSizeBytes)
    .toString('utf-8');

  // Add a truncation note if requested
  if (addTruncationNote) {
    truncatedContent += `\n\n[Content truncated due to size limit. Total content size: ${originalSizeKB.toFixed(2)}KB]`;
  }

  return {
    content: truncatedContent,
    isTruncated: true,
    originalSizeKB,
  };
}
