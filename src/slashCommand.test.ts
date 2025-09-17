import { describe, expect, test } from 'vitest';
import { isSlashCommand } from './slashCommand';

describe('isSlashCommand', () => {
  test('basic command', () => {
    expect(isSlashCommand('/help')).toBe(true);
    expect(isSlashCommand('/help foo')).toBe(true);
    expect(isSlashCommand('/help foo bar')).toBe(true);
    expect(isSlashCommand('/help src/demo')).toBe(true);
    expect(isSlashCommand('/help src/demo.md')).toBe(true);
    expect(isSlashCommand('/help /demo/a')).toBe(true);
    expect(isSlashCommand('/help /demo')).toBe(true);
    expect(isSlashCommand('/')).toBe(false);
  });

  test('command with tab arg', () => {
    expect(isSlashCommand('/help\tfoo')).toBe(true);
  });
  test('command with multiple spaces', () => {
    expect(isSlashCommand('/help    foo')).toBe(true);
  });
  test('leading and trailing whitespace', () => {
    expect(isSlashCommand('   /help   ')).toBe(true);
  });
  test('full width space between command and arg', () => {
    expect(isSlashCommand('/help　foo')).toBe(true);
  });
  test('file path should be false', () => {
    expect(isSlashCommand('/foo/bar')).toBe(false);
  });
  test('slash in args should be true', () => {
    expect(isSlashCommand('/notpath foo/bar')).toBe(true);
  });
  test('non-slash input', () => {
    expect(isSlashCommand('help')).toBe(false);
  });
  test('leading tab before command', () => {
    expect(isSlashCommand('\t/help\targ')).toBe(true);
  });
  test('unicode command', () => {
    expect(isSlashCommand('/中文')).toBe(true);
  });
  test('empty string', () => {
    expect(isSlashCommand('')).toBe(false);
  });
});
