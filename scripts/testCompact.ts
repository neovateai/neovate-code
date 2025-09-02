import { compact } from '../src/next/compact';
import type { NormalizedMessage } from '../src/next/history';
import { modelAlias, providers, resolveModel } from '../src/next/model';

async function compactTest() {
  const messages = [
    {
      role: 'user',
      content: 'Hello, how are you?',
    },
    {
      role: 'assistant',
      content: 'I am good, thank you!',
    },
  ];
  const model = await resolveModel('iflow/q3-coder', providers, modelAlias);
  const result = await compact({
    messages: messages as NormalizedMessage[],
    model,
  });
  console.log(result);
}

compactTest().catch(console.error);
