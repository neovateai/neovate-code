// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { run } from './commands/default';

const root = path.join(__dirname, '../..');
const fixtures = path.join(root, 'fixtures');
const model = 'flash';
const cwd = path.join(fixtures, 'normal');
const runOpts = {
  argvConfig: {
    model,
  },
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
      'list the dir and tell me the number of ts files, notice number only (using ls tool)',
  });
  expect(result.finalOutput).toContain('2');
});

test('tool(edit)', async () => {
  fs.mkdirSync(path.join(cwd, 'tmp'), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, 'tmp/package.txt'),
    `
version: 1.0.0
name: takumi-test-fixture-normal
description: A test fixture for takumi
  `,
  );
  const result = await run({
    ...runOpts,
    prompt: 'edit tmp/package.txt and update the version to next patch version',
  });
  const hasEditToolCall = result.history.some(
    (h: any) => h.type === 'function_call' && h.name === 'edit',
  );
  expect(hasEditToolCall).toBe(true);
  const packageTxt = path.join(cwd, 'tmp/package.txt');
  expect(fs.readFileSync(packageTxt, 'utf-8').includes('1.0.1')).toBe(true);
});

test('tool(bash)', async () => {
  const result = await run({
    ...runOpts,
    prompt: 'make directory tmp/a',
  });
  const aDir = path.join(cwd, 'tmp/a');
  const hasBashToolCall = result.history.some(
    (h: any) => h.type === 'function_call' && h.name === 'bash',
  );
  expect(hasBashToolCall).toBe(true);
  expect(fs.existsSync(aDir)).toBe(true);
});

test('tool(fetch)', async () => {
  const result = await run({
    ...runOpts,
    prompt: 'fetch https://sorrycc.com/about and tell me how old is he',
  });
  expect(result.finalOutput).toContain('35');
});
