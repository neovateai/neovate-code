import type { Message, NormalizedMessage } from '../../message';

/**
 * Get a preview text from a message, truncated to 80 characters
 */
export function getMessagePreview(message: Message): string {
  let text = '';
  if (typeof message.content === 'string') {
    text = message.content;
  } else if (Array.isArray(message.content)) {
    const textParts = message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text);
    text = textParts.join(' ');
  }
  return text.length > 80 ? text.slice(0, 80) + '...' : text;
}

/**
 * Format a message timestamp in a human-readable format
 */
export function getMessageTimestamp(message: NormalizedMessage): string {
  if (!message.timestamp) return '';
  const date = new Date(message.timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a message timestamp with relative time (e.g., "5m ago")
 */
export function getRelativeTimestamp(message: NormalizedMessage): string {
  if (!message.timestamp) return '';
  const date = new Date(message.timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
