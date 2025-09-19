import assert from 'assert';
import type { TaskModule } from '../../../types';

export const task: TaskModule = {
  cliArgs: 'version of @package.json',
  test: (opts) => {
    console.log(opts.result);
    assert(opts.result.includes('1.0.0-alpha.822'));
    assert(opts.assistantMessages.length === 1);
  },
};
