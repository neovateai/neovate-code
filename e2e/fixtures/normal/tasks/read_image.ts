import assert from 'assert';
import type { TaskModule } from '../../../types';

export const task: TaskModule = {
  cliArgs: ['content of n.png'],
  model: 'sonnet',
  test: (opts) => {
    console.log(opts.result);

    // Check that the assistant responded
    assert(opts.assistantMessages.length >= 1);

    // Verify the result includes "neovate"
    const resultText = opts.result.toLowerCase();
    assert(
      resultText.toLowerCase().includes('neovate'),
      'Result should include "neovate"',
    );
  },
};
