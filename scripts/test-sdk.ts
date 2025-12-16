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
    console.log(JSON.stringify(msg, null, 2));
  }

  session.close();
  console.log('\nSession closed');
}

main().catch(console.error);
