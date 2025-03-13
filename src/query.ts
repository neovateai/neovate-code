import { CoreMessage, generateText } from 'ai';
import { getModel } from './model';
import { bashTool } from './tools/BashTool/BashTool';
import { fileEditTool } from './tools/FileEditTool/FileEditTool';
import { fileReadTool } from './tools/FileReadTool/FileReadTool';

type Message = CoreMessage;

interface QueryOptions {
  messages: Message[];
  systemPrompt: string[];
  context: Record<string, string>;
  model: ReturnType<typeof getModel>;
}

export async function query(opts: QueryOptions) {
  const { messages, systemPrompt, model } = opts;
  console.log('>> messages', messages);
  const result = await generateText({
    model,
    messages,
    system: systemPrompt.join('\n'),
    tools: {
      fileRead: fileReadTool,
      fileEdit: fileEditTool,
      bash: bashTool,
    },
    onStepFinish: (step) => {
      // console.log('step', step);
    },
  });

  return result;
}
