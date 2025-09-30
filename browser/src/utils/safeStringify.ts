export function safeStringify(
  obj: Record<string, any>,
  fallbackMessage = '[Unable to serialize object]',
): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (_error) {
    return fallbackMessage;
  }
}
