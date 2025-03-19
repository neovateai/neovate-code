import { generateText, streamText } from 'ai';
import { z } from 'zod';
import { ModelType, getModel } from './model';
import { getTools } from './tools';

export async function test(argv: any): Promise<void> {
  const model = argv.model || 'GrokMirror/grok-3-think';
  const modelInstance = getModel(model);
  const prompt =
    argv.prompt ||
    'What is the difference between Claude-3-Opus and Claude-3-Sonnet?';

  console.log(`Testing model: ${model}`);
  console.log(`Prompt: ${prompt}`);
  console.log('Response:');

  const result = await streamText({
    model: modelInstance,
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const text of result.textStream) {
    process.stdout.write(text);
  }
}

/**
 * A simple test function that makes an AI call using the provided model and prompt.
 */
export async function test2(): Promise<void> {
  const model = 'Vscode/claude-3.5-sonnet';
  const modelInstance = getModel(model);
  const prompt = 'What is the weather in Tokyo?';

  console.log(`Testing model: ${model}`);
  console.log(`Prompt: ${prompt}`);
  console.log('Response:');

  // const result = await generateText({
  //   model: modelInstance,
  //   messages: [{ role: 'user', content: prompt }],
  //   // system: 'You are a helpful assistant.',
  //   // tools: {
  //     // 'test-tool': {
  //     //   description: 'A tool to get the weather in a city',
  //     //   parameters: z.object({
  //     //     city: z.string(),
  //     //   }),
  //     //   execute: async ({ city }) => {
  //     //     return {
  //     //       result: `The weather in ${city} is sunny.`,
  //     //     };
  //     //   },
  //     // },
  //     // ...(await getTools()),
  //   // },
  // });

  // console.log(result.text);

  const stream = await streamText({
    model: modelInstance,
    messages: [{ role: 'user', content: prompt }],
    system: 'You are a helpful assistant.',
    tools: {
      'test-tool': {
        description: 'A tool to get the weather in a city',
        parameters: z.object({
          city: z.string(),
        }),
        execute: async ({ city }) => {
          console.log(`[test-tool] city: ${city}`);
          return {
            result: `The weather in ${city} is sunny.`,
          };
        },
      },
      ...(await getTools()),
    },
  });

  for await (const text of stream.textStream) {
    process.stdout.write(text + '\n');
  }

  const steps = await stream.steps;
  console.log(`[steps] ${JSON.stringify(steps)}`);

  const toolCalls = await stream.toolCalls;
  console.log(`[toolCalls] ${JSON.stringify(toolCalls)}`);

  const toolResults = await stream.toolResults;
  console.log(`[toolResults] ${JSON.stringify(toolResults)}`);

  const text = await stream.text;
  console.log(`[text] ${text}`);

  // Add a newline at the end
  console.log('\n');
}
