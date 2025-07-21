export function refresh(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    process.stdout.write('\x1B[2J\x1B[3J\x1B[H', () => {
      resolve(true);
    });
  });
}
