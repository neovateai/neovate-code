export function detectImageFormat(base64Data: string): string {
  if (!base64Data) {
    return 'png';
  }

  const header = base64Data.substring(0, 10);

  if (header.startsWith('/9j/')) {
    return 'jpeg';
  }

  if (header.startsWith('iVBORw')) {
    return 'png';
  }

  if (header.startsWith('R0lGOD')) {
    return 'gif';
  }

  if (header.startsWith('UklGR')) {
    return 'webp';
  }

  if (header.startsWith('AAABAA')) {
    return 'ico';
  }

  if (header.startsWith('Qk')) {
    return 'bmp';
  }

  return 'png';
}
