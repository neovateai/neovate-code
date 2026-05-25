import assert from 'assert';
import type { TaskModule } from '../../../types';

// Live E2E check that the newly added `deepseek/deepseek-v4-pro` built-in model
// actually resolves and is callable against the real DeepSeek API.
//
// The `model` annotation pins this task to the model regardless of E2E_MODEL,
// which is exactly the mechanism we want to exercise. Credentials come from the
// caller's global ~/.neovate/config.json (provider.deepseek.options.apiKey).
export const task: TaskModule = {
  model: 'deepseek/deepseek-v4-pro',
  cliArgs: [
    'Reply with exactly the single word PONG in uppercase. No punctuation, no other text.',
  ],
  test: (opts) => {
    console.log(opts.result);

    // The CLI run did not surface an API/model error...
    assert(!opts.isError, 'CLI reported an error (model likely unreachable)');
    // ...the model produced at least one assistant turn...
    assert(
      opts.assistantMessages.length >= 1,
      'expected at least one assistant message',
    );
    // ...and we got a non-empty final result that contains the echoed token.
    assert(opts.result, 'expected a non-empty result');
    assert(
      /pong/i.test(opts.result),
      `expected result to contain "PONG", got: ${opts.result}`,
    );
  },
};
