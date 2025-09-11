const IMAGE_PREFIX_REGEX = /^data:image\/[^;]+;base64,/;

/**
 * Removes the data URL prefix from an image data URL string.
 *
 * @param dataUrl - The image data URL string
 * @returns The base64 encoded string without the data URL prefix
 * @throws {TypeError} When dataUrl is not a string
 *
 * @example
 * ```typescript
 * const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
 * const base64 = removeImagePrefix(dataUrl);
 * // Returns: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
 * ```
 */
export function removeImagePrefix(dataUrl: string): string {
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  const match = dataUrl.match(IMAGE_PREFIX_REGEX);
  if (!match) {
    return dataUrl;
  }
  return dataUrl.slice(match[0].length);
}
