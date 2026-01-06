// Determine whether running in local development environment
// - Bun: Local development environment
export function isLocal(): boolean {
  return typeof Bun !== 'undefined';
}
