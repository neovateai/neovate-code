import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer } from '../server';

describe('Completions', () => {
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    server = await createServer({
      prompt: 'Hello, world!',
      traceName: 'test-completions',
      argvConfig: {
        model: 'deepseek',
      },
    });
  });

  // 仅用于测试 并不做实际单侧行为
  test('should return a valid response', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/chat/completions',
      body: {
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
      },
    });

    console.log('Response data:', response.body);
  });

  afterAll(() => {
    server.close();
  });
});
