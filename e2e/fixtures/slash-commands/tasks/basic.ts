import assert from 'assert';
import type { TaskModule } from '../../../types';

export const task: TaskModule = {
  cliArgs: ['/foo'],
  test: (opts) => {
    console.log(opts.result);
    assert(opts.result.includes('2'));
    assert(opts.assistantMessages.length === 1);
  },
};
