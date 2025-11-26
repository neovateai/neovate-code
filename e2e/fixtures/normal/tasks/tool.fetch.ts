import assert from 'assert';
import type { TaskModule } from '../../../types';

export const task: TaskModule = {
  cliArgs: ['summarize the content of https://sorrycc.com/about'],
  test: (opts) => {
    console.log(opts.result);

    // Check that the assistant created messages
    assert(
      opts.assistantMessages.length >= 1,
      'Should have at least one assistant message',
    );

    assert(
      opts.result.includes('ChenCheng') ||
        opts.result.includes('Chen Cheng') ||
        opts.result.includes('云谦'),
      'Should mention ChenCheng or Chen Cheng or 云谦',
    );
  },
};
