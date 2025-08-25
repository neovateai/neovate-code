import { type AgentInputItem } from '@openai/agents';
import { FilesContributor } from './context-contributor';
import { PluginHookType } from './plugin';
import { Service } from './service';

type QueryOpts = {
  input: string | AgentInputItem[];
  service: Service;
  thinking?: boolean;
  model?: string;
  onTextDelta?: (text: string) => void;
  onText?: (text: string) => void;
  onReasoning?: (text: string) => void;
  onToolUse?: (
    callId: string,
    name: string,
    params: Record<string, any>,
    cwd: string,
  ) => void;
  onToolUseResult?: (
    callId: string,
    name: string,
    result: string,
    args?: Record<string, any>,
  ) => void;
  onToolApprove?: (
    callId: string,
    name: string,
    params: Record<string, any>,
  ) => Promise<boolean>;
  onCancelCheck?: () => boolean;
};

export async function query(opts: QueryOpts) {
  const { service, thinking } = opts;
  const startTime = Date.now();
  const abortController = new AbortController();
  let input =
    typeof opts.input === 'string'
      ? [
          {
            role: 'user' as const,
            content: opts.input,
          },
        ]
      : opts.input;
  const prompt =
    input.length && typeof (input[0] as any).content === 'string'
      ? (input[0] as any).content
      : undefined;

  // Format the last user message using FileContributor
  let lastUserMessageIndex = -1;
  for (let i = input.length - 1; i >= 0; i--) {
    if ((input[i] as any).role === 'user') {
      lastUserMessageIndex = i;
      break;
    }
  }
  if (lastUserMessageIndex !== -1) {
    const lastUserMessage = input[lastUserMessageIndex] as any;
    const filesContributor = new FilesContributor();
    const fileContent = await filesContributor.getContent({
      context: service.context,
      prompt:
        typeof lastUserMessage.content === 'string'
          ? lastUserMessage.content
          : '',
    });
    if (fileContent) {
      input[lastUserMessageIndex] = {
        ...lastUserMessage,
        content: `${lastUserMessage.content}\n\n${fileContent}`,
      };
    }
  }

  let finalText: string | null = null;
  let isFirstRun = true;
  while (true) {
    // Check for cancellation before starting each iteration
    if (opts.onCancelCheck && opts.onCancelCheck()) {
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
      return {
        finalText: null,
        history: service.history,
        cancelled: true,
      };
    }

    let hasToolUse = false;
    try {
      const { stream } = await service.run({
        input,
        thinking,
        // disable thinking for non-first runs
        ...(isFirstRun ? {} : { thinking: false }),
        ...(opts.model ? { model: opts.model } : {}),
        abortSignal: abortController.signal,
      });

      for await (const chunk of stream) {
        const parsed = parseStreamChunk(chunk.toString());
        for (const item of parsed) {
          switch (item.type) {
            case 'text-delta':
              await opts.onTextDelta?.(item.content);
              break;
            case 'text':
              await opts.onText?.(item.content);
              finalText = item.content;
              break;
            case 'reasoning':
              await opts.onReasoning?.(item.content);
              break;
            case 'tool_use':
              await opts.onToolUse?.(
                item.callId,
                item.name,
                item.params,
                service.context.cwd,
              );

              // Check if approval is needed
              const needsApproval = await service.shouldApprove(
                item.name,
                item.params,
              );
              let approved = true;

              if (needsApproval && opts.onToolApprove) {
                approved = await opts.onToolApprove(
                  item.callId,
                  item.name,
                  item.params,
                );
              }

              if (approved) {
                const result = await service.callTool(
                  item.callId,
                  item.name,
                  item.params,
                );
                await opts.onToolUseResult?.(
                  item.callId,
                  item.name,
                  result,
                  item.params,
                );
                hasToolUse = true;
              } else {
                // Tool execution was denied by user - stop the query
                const deniedResult = 'Tool execution was denied by user.';
                await opts.onToolUseResult?.(
                  item.callId,
                  item.name,
                  deniedResult,
                );
                return {
                  finalText: null,
                  history: service.history,
                  denied: true,
                };
              }
              break;
            default:
              break;
          }
        }
      }
    } catch (error: any) {
      // Handle abort errors gracefully
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        return {
          finalText: null,
          history: service.history,
          cancelled: true,
        };
      }
      // Re-throw other errors
      throw error;
    }

    if (hasToolUse) {
      input = [];
      isFirstRun = false;
    } else {
      break;
    }
  }
  await service.context.apply({
    hook: 'conversation',
    args: [
      {
        prompt,
        finalText,
        history: service.history,
        startTime,
        endTime: Date.now(),
      },
    ],
    type: PluginHookType.Series,
  });
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
