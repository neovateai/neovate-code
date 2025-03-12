import { createOpenAI } from '@ai-sdk/openai';
import { CoreMessage, generateText } from 'ai';
import { fileEditTool } from './tools/FileEditTool/FileEditTool';
import { fileReadTool } from './tools/FileReadTool/FileReadTool';

// TODO: fix me
type Message = CoreMessage;

interface QueryOptions {
  messages: Message[];
  systemPrompt: string[];
  context: Record<string, string>;
}

export async function query(opts: QueryOptions) {
  const { messages, systemPrompt } = opts;
  const openai = createOpenAI({
    apiKey: process.env.GOOGLE_API_KEY,
    baseURL: process.env.GOOGLE_BASE_URL,
  });

  console.log('messages', messages);
  console.log('systemPrompt', systemPrompt);
  const result = await generateText({
    // deepseek-chat
    // deepseek-reasoner
    // qwen-qwq-32b
    // gemini-2.0-flash-thinking-exp-01-21
    // gemini-2.0-flash-001
    // gemini-2.0-pro-exp-02-05
    model: openai('gemini-2.0-pro-exp-02-05'),
    messages,
    system: systemPrompt.join('\n'),
    tools: {
      fileRead: fileReadTool,
      fileEdit: fileEditTool,
    },
  });

  return result.text;
}
