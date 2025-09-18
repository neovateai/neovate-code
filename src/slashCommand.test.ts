import { expect, test } from 'vitest';
import { isSlashCommand } from './slashCommand';

test('isSlashCommand', () => {
  expect(isSlashCommand('/help')).toBe(true);
  expect(isSlashCommand('/help foo')).toBe(true);
  expect(isSlashCommand('/help foo bar')).toBe(true);
  expect(isSlashCommand('/help src/demo')).toBe(true);
  expect(isSlashCommand('/help src/demo.md')).toBe(true);
  expect(isSlashCommand('/help /demo/a')).toBe(true);
  expect(isSlashCommand('/help /demo')).toBe(true);
  expect(isSlashCommand('/help /demo/a.ts')).toBe(true);
  expect(isSlashCommand('/g:review')).toBe(true);
  expect(isSlashCommand('/g:review /demo')).toBe(true);
  expect(isSlashCommand('/')).toBe(false);
  expect(isSlashCommand('/foo/bar')).toBe(false);
  expect(isSlashCommand('help')).toBe(false);
});
