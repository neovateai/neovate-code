import { AgentInputItem } from '@openai/agents';
import { Service } from './service';

type QueryOpts = {
  input: string | AgentInputItem[];
  service: Service;
  thinking?: boolean;
  onTextDelta?: (text: string) => void;
  onText?: (text: string) => void;
  onReasoning?: (text: string) => void;
  onToolUse?: (
    callId: string,
    name: string,
    params: Record<string, any>,
    cwd: string,
  ) => void;
  onToolUseResult?: (callId: string, name: string, result: string) => void;
  onToolApprove?: (
    callId: string,
    name: string,
    params: Record<string, any>,
  ) => Promise<boolean>;
  onCancelCheck?: () => boolean;
};

export async function query(opts: QueryOpts) {
  const { service, thinking } = opts;
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
  let isFirstRun = true;
  while (true) {
    // Check for cancellation before starting each iteration
    if (opts.onCancelCheck && opts.onCancelCheck()) {
      return {
        finalText: null,
        history: service.history,
        cancelled: true,
      };
    }

    const { stream } = await service.run({
      input,
      thinking,
      // disable thinking for non-first runs
      ...(isFirstRun ? {} : { thinking: false }),
    });
    let hasToolUse = false;
    for await (const chunk of stream) {
      // Check for cancellation during stream processing
      if (opts.onCancelCheck && opts.onCancelCheck()) {
        return {
          finalText: null,
          history: service.history,
          cancelled: true,
        };
      }

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
              await opts.onToolUseResult?.(item.callId, item.name, result);
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
    if (hasToolUse) {
      input = [];
      isFirstRun = false;
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
