import { createSession } from '../src/sdk';

async function main() {
  console.log('Creating SDK session...');
  const session = await createSession({
    model: 'iflow/qwen3-coder-plus',
  });
  console.log('Session created:', session.sessionId);

  console.log('\nSending message: "hello"');
  await session.send('hello');

  console.log('\nReceiving response:');
  for await (const msg of session.receive()) {
    switch (msg.type) {
      case 'text':
        process.stdout.write(msg.text);
        break;
      case 'thinking':
        console.log('[thinking]', msg.text);
        break;
      case 'tool_use':
        console.log(`\n[tool_use] ${msg.name}:`, msg.input);
        break;
      case 'tool_result':
        console.log(`[tool_result] ${msg.name}:`, msg.result);
        break;
      case 'done':
        console.log('\n\n[done] Usage:', msg.usage);
        break;
      case 'error':
        console.error('\n[error]', msg.message);
        break;
    }
  }

  session.close();
  console.log('\nSession closed');
}

main().catch(console.error);
