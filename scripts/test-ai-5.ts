import { createOpenAI, openai } from '@ai-sdk/openai';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { withTrace } from '@openai/agents';
import { aisdk } from '../src/utils/ai-sdk';

async function main() {
  console.log('Testing AI SDK with OpenAI GPT-4...\n');

  // Create the AI SDK model (implements LanguageModelV2 interface)
  const aiSdkModel: LanguageModelV2 = createOpenAI({
    baseURL: 'https://apis.iflow.cn/v1',
    apiKey: process.env.IFLOW_API_KEY,
  }).chat('qwen3-coder');

  // Wrap it with the aisdk wrapper for OpenAI Agents SDK compatibility
  const model = aisdk(aiSdkModel);

  try {
    // Test 1: Simple text generation
    console.log('Test 1: Simple text generation');
    console.log('================================');
    const response = await model.getResponse({
      input: 'What is 2 + 2? Please answer concisely.',
      systemInstructions: 'You are a helpful assistant.',
      tools: [],
      handoffs: [],
      outputType: 'text',
      modelSettings: {
        temperature: 0.7,
      },
      tracing: false,
    });

    console.log('Response ID:', response.responseId);
    console.log('Usage:', {
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      totalTokens: response.usage.totalTokens,
    });
    console.log('Output:', JSON.stringify(response.output, null, 2));

    // Test 2: Streaming response
    console.log('\n\nTest 2: Streaming text generation');
    console.log('==================================');
    let streamedText = '';

    for await (const event of model.getStreamedResponse({
      input: 'Count from 1 to 5.',
      systemInstructions: 'You are a helpful assistant.',
      tools: [],
      handoffs: [],
      outputType: 'text',
      modelSettings: {
        temperature: 0.7,
      },
      tracing: false,
    })) {
      if (event.type === 'output_text_delta') {
        process.stdout.write(event.delta);
        streamedText += event.delta;
      } else if (event.type === 'response_done') {
        console.log('\n\nFinal response:', {
          id: event.response.id,
          usage: event.response.usage,
        });
      }
    }

    console.log('\n\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  }
}

(async () => {
  await withTrace('test', async () => {
    await main();
  });
})();
