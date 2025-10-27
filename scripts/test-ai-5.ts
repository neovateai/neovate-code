import { createOpenAI, openai } from '@ai-sdk/openai';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { withTrace } from '@openai/agents';
import { aisdk } from '../src/utils/ai-sdk';
import { z } from 'zod';

// Weather tool function
async function getWeather(city: string): Promise<string> {
  // Simulate weather API call
  const weatherData: Record<string, { temp: number; condition: string }> = {
    'San Francisco': { temp: 18, condition: 'Partly cloudy' },
    'New York': { temp: 22, condition: 'Sunny' },
    London: { temp: 15, condition: 'Rainy' },
    Tokyo: { temp: 25, condition: 'Clear' },
    Paris: { temp: 20, condition: 'Cloudy' },
  };

  const weather = weatherData[city] || { temp: 20, condition: 'Unknown' };
  return JSON.stringify({
    city,
    temperature: weather.temp,
    condition: weather.condition,
    unit: 'Celsius',
  });
}

async function main() {
  console.log('Testing AI SDK with weather tool...\n');

  // Create the AI SDK model (implements LanguageModelV2 interface)
  const aiSdkModel: LanguageModelV2 = createOpenAI({
    baseURL: 'https://apis.iflow.cn/v1',
    apiKey: process.env.IFLOW_API_KEY,
  }).chat('qwen3-coder');

  // Wrap it with the aisdk wrapper for OpenAI Agents SDK compatibility
  const model = aisdk(aiSdkModel);

  // Define the weather tool
  const weatherTool = {
    name: 'get_weather',
    description: 'Get the current weather for a given city',
    parameters: z.object({
      city: z.string().describe('The name of the city to get weather for'),
    }),
    execute: async ({ city }: { city: string }) => {
      console.log(`\n[Tool Call] Getting weather for: ${city}`);
      return await getWeather(city);
    },
  };

  try {
    console.log('\n\nTest: Streaming with tool calling');
    console.log('==================================');
    let streamedText = '';

    for await (const event of model.getStreamedResponse({
      input: 'What is the weather like in San Francisco and Tokyo?',
      systemInstructions:
        'You are a helpful weather assistant. Use the get_weather tool to fetch weather information.',
      tools: [weatherTool],
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
      } else if (event.type === 'tool_call_delta') {
        console.log('\n[Tool Call Delta]:', event);
      } else if (event.type === 'tool_call_streaming_start') {
        console.log(
          '\n[Tool Call Streaming Start]:',
          event.toolCallId,
          event.toolName,
        );
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
