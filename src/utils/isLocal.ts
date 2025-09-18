// when run in local, it's should be runned with bun
export function isLocal(): boolean {
  return typeof Bun !== 'undefined';
}
