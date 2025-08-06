export function clearTerminal(): Promise<void> {
  return new Promise((resolve) => {
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H', () => {
      resolve();
    });
  });
}
