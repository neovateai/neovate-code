import assert from 'assert';
import type { Context } from './context';
import { runLoop } from './loop';
import type { NormalizedMessage } from './message';
import { type ModelInfo, resolveModelWithContext } from './model';
import { Tools } from './tool';
import { randomUUID } from './utils/randomUUID';

export async function query(opts: {
  userPrompt: string;
  messages?: NormalizedMessage[];
  context?: Context;
  model?: ModelInfo;
  systemPrompt?: string;
  onMessage?: (message: NormalizedMessage) => Promise<void>;
  thinking?:
    | false
    | {
        effort: 'low' | 'medium' | 'high';
      };
}) {
  const messages: NormalizedMessage[] = [
    ...(opts.messages || []),
    {
      role: 'user',
      content: opts.userPrompt,
      type: 'message',
      timestamp: new Date().toISOString(),
      uuid: randomUUID(),
      parentUuid: null,
    },
  ];
  assert(opts.model || opts.context, 'model or context is required');
  const model =
    opts.model || (await resolveModelWithContext(null, opts.context!)).model!;
  return await runLoop({
    input: messages,
    model,
    tools: new Tools([]),
    cwd: '',
    systemPrompt: opts.systemPrompt || '',
    onMessage: async (message) => {
      await opts.onMessage?.(message);
    },
    autoCompact: false,
    thinking: opts.thinking !== false ? opts.thinking : undefined,
  });
}
