import assert from 'assert';
import type { TaskModule } from '../../../types';

export const task: TaskModule = {
  cliArgs: [
    `say hi`,
    '--output-style',
    '{"prompt":"append WangWang after every response"}',
  ],
  test: (opts) => {
    console.log(opts.result);
    assert(opts.result.includes('WangWang'));
  },
};
