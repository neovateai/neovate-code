import { describe, expect, test } from 'vitest';
import { getCommandRoot, shouldRunInBackground } from './background-detection';

describe('background-detection', () => {
  test('should extract command root', () => {
    expect(getCommandRoot('npm run dev')).toBe('npm');
    expect(getCommandRoot('pnpm install')).toBe('pnpm');
    expect(getCommandRoot('/usr/bin/node script.js')).toBe('node');
  });

  test('should return true when user explicitly requests background', () => {
    expect(shouldRunInBackground('any command', 0, false, true)).toBe(true);
  });

  test('should return false for short running commands', () => {
    expect(shouldRunInBackground('npm run dev', 1000, true, false)).toBe(false);
  });

  test('should return false without output', () => {
    expect(shouldRunInBackground('npm run dev', 3000, false, false)).toBe(
      false,
    );
  });

  test('should return false for non-dev commands', () => {
    expect(shouldRunInBackground('echo hello', 3000, true, false)).toBe(false);
  });

  test('should return true for dev commands with output after 2s', () => {
    expect(shouldRunInBackground('npm run dev', 2500, true, false)).toBe(true);
    expect(shouldRunInBackground('pnpm dev', 2500, true, false)).toBe(true);
    expect(shouldRunInBackground('yarn start', 2500, true, false)).toBe(true);
  });
});
