import { CoreMessage, Tool, generateText } from 'ai';
import { getModel } from './model';

interface QueryOptions {
  messages: CoreMessage[];
  systemPrompt: string[];
  context: Record<string, string>;
  model: ReturnType<typeof getModel>;
  tools: Record<string, Tool>;
}

export async function query(opts: QueryOptions) {
  const { messages, systemPrompt, model, tools } = opts;
  console.log('>> messages', messages);
  const result = await generateText({
    model,
    messages,
    system: systemPrompt.join('\n'),
    tools,
  });

  return result;
}
