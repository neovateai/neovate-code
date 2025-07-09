import { AgentInputItem } from '@openai/agents';
import createDebug from 'debug';
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
  abortSignal?: AbortSignal;
};

export async function query(opts: QueryOpts) {
  const debug = createDebug('takumi:query');
  const { service, thinking, abortSignal } = opts;
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
    if (abortSignal?.aborted) {
      debug('Detected cancel signal, stopping query processing');
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
      abortSignal,
    });
    let hasToolUse = false;

    try {
      for await (const chunk of stream) {
        // Check abortSignal.aborted directly
        if (abortSignal?.aborted) {
          if (typeof stream.destroy === 'function') {
            stream.destroy();
          }
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
              // Check cancel status again
              if (abortSignal?.aborted) {
                debug('Detected cancel signal before tool call, stopping');
                return {
                  finalText: null,
                  history: service.history,
                  cancelled: true,
                };
              }

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
                // Check cancel status again
                if (abortSignal?.aborted) {
                  debug(
                    'Detected cancel signal before tool approval, stopping',
                  );
                  return {
                    finalText: null,
                    history: service.history,
                    cancelled: true,
                  };
                }

                debug('Requesting tool approval:', item.name);
                approved = await opts.onToolApprove(
                  item.callId,
                  item.name,
                  item.params,
                );
                debug(
                  'Tool approval result:',
                  approved ? 'approved' : 'denied',
                );
              }

              if (approved) {
                // Check cancel status again
                if (abortSignal?.aborted) {
                  debug(
                    'Detected cancel signal before tool execution, stopping',
                  );
                  return {
                    finalText: null,
                    history: service.history,
                    cancelled: true,
                  };
                }

                debug('Starting tool execution:', item.name);
                const result = await service.callTool(
                  item.callId,
                  item.name,
                  item.params,
                );
                debug('Tool execution completed:', item.name);

                // Check cancel status again
                if (abortSignal?.aborted) {
                  debug(
                    'Detected cancel signal after tool execution, stopping',
                  );
                  return {
                    finalText: null,
                    history: service.history,
                    cancelled: true,
                  };
                }

                await opts.onToolUseResult?.(
                  item.callId,
                  item.name,
                  result,
                  item.params,
                );
                hasToolUse = true;
              } else {
                // Tool execution was denied by user - stop the query
                debug('Tool execution was denied');
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
    } catch (error) {
      // Check if error is due to cancellation
      if (abortSignal?.aborted) {
        debug('Caught error, detected cancel signal, stopping processing');
        return {
          finalText: null,
          history: service.history,
          cancelled: true,
        };
      }
      // Re-throw other errors
      debug('Caught error, not caused by cancellation:', error);
      throw error;
    }

    if (hasToolUse) {
      // Check cancel status again
      if (abortSignal?.aborted) {
        debug('Detected cancel signal after tool use, stopping');
        return {
          finalText: null,
          history: service.history,
          cancelled: true,
        };
      }

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
