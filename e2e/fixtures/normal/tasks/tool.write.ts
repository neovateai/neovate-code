import assert from 'assert';
import fs from 'fs';
import path from 'path';
import type { TaskModule } from '../../../types';

export const task: TaskModule = {
  cliArgs: ['write a.txt with fooooo'],
  test: (opts) => {
    console.log(opts.result);

    // Check that the assistant used the write tool
    assert(opts.assistantMessages.length >= 1);

    // Verify the file was created
    const filePath = path.join(opts.cwd, 'a.txt');
    assert(fs.existsSync(filePath), 'a.txt should exist');

    // Verify the file contents
    const content = fs.readFileSync(filePath, 'utf-8');
    assert(content.includes('fooooo'), 'a.txt should contain "fooooo"');

    // Clean up
    fs.unlinkSync(filePath);
  },
};
