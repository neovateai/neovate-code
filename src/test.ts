import { generateText, streamText } from 'ai';
import { getModel, ModelType } from './model';
import { z } from 'zod';
import { getTools } from './tools';

/**
 * A simple test function that makes an AI call using the provided model and prompt.
 * @param model The model identifier
 * @param prompt The text prompt to send to the AI
 */
export async function test(model: ModelType, prompt: string): Promise<void> {
  const modelInstance = getModel(model);

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
