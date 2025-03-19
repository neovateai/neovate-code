import { CoreMessage, Tool, generateText, streamText } from 'ai';
import { ModelType, getModel } from './model';

interface QueryOptions {
  messages: CoreMessage[];
  systemPrompt: string[];
  context: Record<string, any>;
  model: ModelType;
  tools: Record<string, Tool>;
  stream?: boolean;
  outputStream?: boolean;
}

export async function query(opts: QueryOptions) {
  const {
    messages,
    systemPrompt,
    context,
    tools,
    stream = false,
    outputStream = false,
  } = opts;
  const model = getModel(opts.model);
  console.log('>> messages', JSON.stringify(messages, null, 2));
  const system = [
    ...systemPrompt,
    `As you answer the user's questions, you can use the following context:`,
    ...Object.entries(context).map(
      ([key, value]) => `<context name="${key}">${value}</context>`,
    ),
  ].join('\n');
  if (stream) {
    const result = await streamText({
      model,
      messages,
      system,
      tools,
    });
    for await (const text of result.textStream) {
      if (outputStream) {
        process.stdout.write(text + '\n');
      }
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
      system,
      tools,
    });
    return result;
  }
}
