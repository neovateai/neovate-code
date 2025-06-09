import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { run } from '.';

const root = path.join(__dirname, '../..');
const fixtures = path.join(root, 'fixtures');
const model = 'flash';
const cwd = path.join(fixtures, 'normal');
const runOpts = {
  model,
  cwd,
  json: true,
};

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

test('tool(write)', async () => {
  await run({
    ...runOpts,
    prompt: 'Write tmp/a.txt with the text "hello world"',
  });
  const aTxt = path.join(cwd, 'tmp/a.txt');
  expect(fs.existsSync(aTxt)).toBe(true);
  expect(fs.readFileSync(aTxt, 'utf-8').includes('hello world')).toBe(true);
});

test('tool(read) not exists', async () => {
  const result = await run({
    ...runOpts,
    prompt: 'Read tmp/not-exists-file.txt, print not exists or the content',
  });
  expect(result.finalOutput).toContain('not exists');
});

test('tool(read)', async () => {
  const result = await run({
    ...runOpts,
    prompt: 'Read package.json and tell me the name of the package',
  });
  expect(result.finalOutput).toContain('takumi-test-fixture-normal');
});

test('tool(ls)', async () => {
  const result = await run({
    ...runOpts,
    prompt:
      'list the dir and tell me the number of ts files, notice number only',
  });
  expect(result.finalOutput).toContain('2');
});
