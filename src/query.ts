import { CoreMessage, Tool, generateText, streamText } from 'ai';
import { getModel } from './model';

interface QueryOptions {
  messages: CoreMessage[];
  systemPrompt: string[];
  context: Record<string, string>;
  model: ReturnType<typeof getModel>;
  tools: Record<string, Tool>;
  stream?: boolean;
}

export async function query(opts: QueryOptions) {
  const { messages, systemPrompt, model, tools, stream = false } = opts;
  console.log('>> messages', messages);
  if (stream) {
    const result = await streamText({
      model,
      messages,
      system: systemPrompt.join('\n'),
      tools,
    });
    for await (const text of result.textStream) {
      // process.stdout.write(text + '\n');
    }
    return {
      steps: await result.steps,
      toolCalls: await result.toolCalls,
      toolResults: await result.toolResults,
      text: await result.text,
    };
  } else {
    const result = await generateText({
      model,
      messages,
      system: systemPrompt.join('\n'),
      tools,
    });
    return result;
  }
}
