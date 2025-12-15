let lastSelectedIndex = -1;

export function rotateApiKey(apiKey: string): string {
  if (!apiKey || !apiKey.includes(',')) {
    return apiKey;
  }

  const keys = apiKey.split(',').map((key) => key.trim());
  if (keys.length === 0) {
    return '';
  }

  let randomIndex: number;
  do {
    randomIndex = Math.floor(Math.random() * keys.length);
  } while (keys.length > 1 && randomIndex === lastSelectedIndex);

  lastSelectedIndex = randomIndex;
  return keys[randomIndex];
}

export function resetRotationIndex(): void {
  lastSelectedIndex = -1;
}
