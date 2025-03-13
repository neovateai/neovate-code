import { CoreMessage, generateText } from 'ai';
import { getModel } from './model';
import { bashTool } from './tools/BashTool/BashTool';
import { fileEditTool } from './tools/FileEditTool/FileEditTool';
import { fileReadTool } from './tools/FileReadTool/FileReadTool';
import { fileWriteTool } from './tools/FileWriteTool/FileWriteTool';
import { grepTool } from './tools/GrepTool/GrepTool';
import { lsTool } from './tools/LsTool/LsTool';
import { globTool } from './tools/GlobTool/GlobTool';

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
      ls: lsTool,
      fileWrite: fileWriteTool,
      grep: grepTool,
      glob: globTool,
    },
    onStepFinish: (step) => {
      // console.log('step', step);
    },
  });

  return result;
}
