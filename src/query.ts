import { CoreMessage, generateText } from 'ai';
import { getModel } from './model';
import { fileEditTool } from './tools/FileEditTool/FileEditTool';
import { fileReadTool } from './tools/FileReadTool/FileReadTool';

type Message = CoreMessage;

interface QueryOptions {
  messages: Message[];
  systemPrompt: string[];
  context: Record<string, string>;
}

export async function query(opts: QueryOptions) {
  const { messages, systemPrompt } = opts;
  console.log('>> messages', messages);
  const result = await generateText({
    model: getModel('deepseek-r1-distill-llama-70b'),
    messages,
    system: systemPrompt.join('\n'),
    tools: {
      fileRead: fileReadTool,
      fileEdit: fileEditTool,
    },
    onStepFinish: (step) => {
      // console.log('step', step);
    },
  });

  return result.text;
}
