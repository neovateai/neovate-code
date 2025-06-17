import { AgentInputItem } from '@openai/agents';
import { Service } from './service';

type QueryOpts = {
  input: string | AgentInputItem[];
  service: Service;
  onTextDelta?: (text: string) => void;
  onText?: (text: string) => void;
  onReasoning?: (text: string) => void;
};

export async function query(opts: QueryOpts) {
  const { service } = opts;
  await service.init();
  let input =
    typeof opts.input === 'string'
      ? [
          {
            role: 'user' as const,
            content: opts.input,
          },
        ]
      : opts.input;
  let finalText: string | null = null;
  while (true) {
    const { stream } = await service.run({
      input,
    });
    let hasToolUse = false;
    for await (const chunk of stream) {
      const parsed = parseStreamChunk(chunk.toString());
      for (const item of parsed) {
        switch (item.type) {
          case 'text-delta':
            opts.onTextDelta?.(item.content);
            break;
          case 'text':
            opts.onText?.(item.content);
            finalText = item.content;
            break;
          case 'reasoning':
            opts.onReasoning?.(item.content);
            break;
          case 'tool_use':
            await service.callTool(item.callId, item.name, item.params);
            hasToolUse = true;
            break;
          default:
            break;
        }
      }
    }
    if (hasToolUse) {
      input = [];
    } else {
      break;
    }
  }
  return {
    finalText,
    history: service.history,
  };
}

function parseStreamChunk(chunk: string) {
  const lines = chunk.split('\n');
  const result: any[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }
    try {
      result.push(JSON.parse(line));
    } catch (error) {
      console.log(`Parse error: ${line}`);
      throw error;
    }
  }
  return result;
}
