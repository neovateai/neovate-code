export function isLocal(): boolean {
  return typeof Bun !== 'undefined' || process.env.NODE_ENV === 'test';
}
