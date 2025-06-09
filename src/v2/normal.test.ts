import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { run } from '.';

const root = path.join(__dirname, '../..');
const fixtures = path.join(root, 'fixtures');
const model = 'flash';
const cwd = path.join(fixtures, 'normal');

function cleanup() {
  const tmpDir = path.join(cwd, 'tmp');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
}

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

test('normal', async () => {
  await run({
    model,
    cwd,
    prompt: 'Write tmp/a.txt with the text "hello world"',
  });
  const aTxt = path.join(cwd, 'tmp/a.txt');
  expect(fs.existsSync(aTxt)).toBe(true);
  expect(fs.readFileSync(aTxt, 'utf-8').includes('hello world')).toBe(true);
});
