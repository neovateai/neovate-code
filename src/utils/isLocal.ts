// Determine whether running in local development or test environment
// - Bun: Local development environment
// - NODE_ENV=test: Test environment (requires access to local file system)
export function isLocal(): boolean {
  return typeof Bun !== 'undefined' || process.env.NODE_ENV === 'test';
}
