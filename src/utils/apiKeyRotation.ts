let currentIndex = 0;

export function rotateApiKey(apiKey: string): string {
  if (!apiKey || !apiKey.includes(',')) {
    return apiKey;
  }

  const keys = apiKey.split(',').map((key) => key.trim());
  if (keys.length === 0) {
    return '';
  }

  const selectedKey = keys[currentIndex % keys.length];
  currentIndex++;

  return selectedKey;
}

export function resetRotationIndex(): void {
  currentIndex = 0;
}
