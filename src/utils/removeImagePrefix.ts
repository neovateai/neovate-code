export function removeImagePrefix(dataUrl: string): string {
  const IMAGE_PREFIX_REGEX = /^data:image\/[^;]+;base64,/;

  if (typeof dataUrl !== 'string') {
    throw new TypeError('dataUrl must be a string');
  }

  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  return dataUrl.replace(IMAGE_PREFIX_REGEX, '');
}
