import { createOpenAI } from '@ai-sdk/openai';
import type {
  JSONSchema7,
  LanguageModelV2,
  LanguageModelV2Prompt,
} from '@ai-sdk/provider';

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

const weatherToolSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    city: {
      type: 'string',
      description: 'The name of the city to get weather for',
    },
  },
  required: ['city'],
  additionalProperties: false,
};

async function main() {
  console.log('Testing AI SDK directly with weather tool...\n');

  // Create the AI SDK model (implements LanguageModelV2 interface)
  const model: LanguageModelV2 = createOpenAI({
    baseURL: 'https://apis.iflow.cn/v1',
    apiKey: process.env.IFLOW_API_KEY,
  }).chat('qwen3-coder');

  try {
    console.log('\n\nTest: Streaming with tool calling');
    console.log('==================================\n');

    const p1: LanguageModelV2Prompt = [
      {
        role: 'system',
        content: 'You are a helpful weather assistant.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'What is the weather like in San Francisco and Tokyo?',
          },
        ],
      },
    ];
    // console.log('p1', p1);
    const { stream } = await model.doStream({
      prompt: p1,
      tools: [
        {
          type: 'function',
          name: 'get_weather',
          description: 'Get the current weather for a given city',
          inputSchema: weatherToolSchema,
        },
      ],
      temperature: 0.7,
    });

    let textContent = '';
    const toolCalls: Array<{
      toolCallId: string;
      toolName: string;
      input: any;
    }> = [];

    // Process the stream
    for await (const part of stream) {
      switch (part.type) {
        case 'text-delta':
          process.stdout.write(part.delta);
          textContent += part.delta;
          break;

        case 'tool-call':
          console.log(`\n[Tool Call] ${part.toolName} (${part.toolCallId})`);
          console.log(`Arguments:`, part.input);
          toolCalls.push({
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            input: part.input,
          });
          break;

        case 'finish':
          console.log('\n[Finish]', {
            finishReason: part.finishReason,
            usage: part.usage,
          });
          break;

        case 'error':
          console.error('\n[Error]', part.error);
          throw part.error;

        default:
          console.log('\n[Unknown event type]', part);
          break;
      }
    }

    // Execute tool calls if any were made
    if (toolCalls.length > 0) {
      console.log('\n\nExecuting tool calls...');
      const toolResults: any[] = [];

      for (const toolCall of toolCalls) {
        if (toolCall.toolName === 'get_weather') {
          console.log('toolCall', toolCall);
          const input = JSON.parse(toolCall.input);
          const result = await getWeather(input.city);
          console.log(`\n[Tool Result] ${toolCall.toolName}:`, result);
          toolResults.push({
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            output: {
              type: 'text',
              value: result,
            },
          });
        }
      }

      // Make a second call with the tool results
      console.log('\n\nGetting final response with tool results...');
      console.log('===========================================\n');

      // Build assistant content: include text (if any) and tool calls
      const assistantContent: Array<any> = [];
      if (textContent) {
        assistantContent.push({
          type: 'text',
          text: textContent,
        });
      }
      assistantContent.push(
        ...toolCalls.map((tc) => ({
          type: 'tool-call' as const,
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          input: tc.input,
        })),
      );

      const prompt: LanguageModelV2Prompt = [
        {
          role: 'system',
          content: 'You are a helpful weather assistant.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What is the weather like in San Francisco and Tokyo?',
            },
          ],
        },
        {
          role: 'assistant',
          content: assistantContent,
        },
        {
          role: 'tool',
          content: toolResults.map((tr) => ({
            type: 'tool-result' as const,
            toolCallId: tr.toolCallId,
            toolName: tr.toolName,
            output: tr.output,
          })),
        },
      ];
      console.log('prompt', prompt);
      const { stream: finalStream } = await model.doStream({
        prompt,
        tools: [
          {
            type: 'function',
            name: 'get_weather',
            description: 'Get the current weather for a given city',
            inputSchema: weatherToolSchema,
          },
        ],
        temperature: 0.7,
      });

      for await (const part of finalStream) {
        // console.log('part', part);
        if (part.type === 'text-delta') {
          process.stdout.write(part.delta);
        } else if (part.type === 'finish') {
          console.log('\n\n[Final Usage]', part.usage);
        }
      }
    }

    console.log('\n\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  }
}

async function main2() {
  console.log('Testing AI SDK directly with weather tool...\n');
  const model: LanguageModelV2 = createOpenAI({
    baseURL: 'https://apis.iflow.cn/v1',
    apiKey: process.env.IFLOW_API_KEY,
  }).chat('qwen3-coder');
  const prompt: LanguageModelV2Prompt = [
    {
      role: 'system',
      content: 'You are a helpful weather assistant.',
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'What is the weather like in San Francisco and Tokyo?',
        },
      ],
    },
    {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId: 'call_a4954fcd20b2cc5c',
          toolName: 'get_weather',
          input: '{"city": "San Francisco"}',
        },
        {
          type: 'tool-call',
          toolCallId: 'call_7a82bfb459c6a799',
          toolName: 'get_weather',
          input: '{"city": "Tokyo"}',
        },
      ],
    },
    {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'call_a4954fcd20b2cc5c',
          toolName: 'get_weather',
          output: {
            type: 'text',
            value:
              '{"city":"San Francisco","temperature":18,"condition":"Partly cloudy","unit":"Celsius"}',
          },
        },
        {
          type: 'tool-result',
          toolCallId: 'call_7a82bfb459c6a799',
          toolName: 'get_weather',
          output: {
            type: 'text',
            value:
              '{"city":"Tokyo","temperature":25,"condition":"Clear","unit":"Celsius"}',
          },
        },
      ],
    },
  ];

  const {
    stream: finalStream,
    request: finalRequest,
    response: finalResponse,
  } = await model.doStream({
    prompt,
    tools: [
      {
        type: 'function',
        name: 'get_weather',
        description: 'Get the current weather for a given city',
        inputSchema: weatherToolSchema,
      },
    ],
    temperature: 0.7,
  });
  // console.log('finalRequest', finalRequest);
  // console.log('finalResponse', finalResponse);
  for await (const part of finalStream) {
    // console.log('part', part);
    if (part.type === 'text-delta') {
      process.stdout.write(part.delta);
    } else if (part.type === 'finish') {
      console.log('\n\n[Final Usage]', part.usage);
    } else {
      // console.log('part', part);
    }
  }
}

main().catch(console.error);
// main2().catch(console.error);
