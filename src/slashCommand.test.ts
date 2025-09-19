import { expect, test } from 'vitest';
import { isSlashCommand, replaceParameterPlaceholders } from './slashCommand';

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

test('replaceParameterPlaceholders', () => {
  expect(replaceParameterPlaceholders('Hello $1', 'world')).toBe('Hello world');
  expect(replaceParameterPlaceholders('$1 $2 $3', 'foo bar baz')).toBe(
    'foo bar baz',
  );
  expect(replaceParameterPlaceholders('Test $1 and $2', 'first second')).toBe(
    'Test first and second',
  );
  expect(
    replaceParameterPlaceholders('No placeholders here', 'some args'),
  ).toBe('No placeholders here');
  expect(replaceParameterPlaceholders('$1 $1 $2', 'hello world')).toBe(
    'hello hello world',
  );
  expect(
    replaceParameterPlaceholders('Missing $3 placeholder', 'one two'),
  ).toBe('Missing $3 placeholder');
  expect(replaceParameterPlaceholders('$1', '')).toBe('');
  expect(replaceParameterPlaceholders('$10 $1', 'a b c d e f g h i j')).toBe(
    'j a',
  );
});
