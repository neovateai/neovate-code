import { AgentInputItem } from '@openai/agents';
import { DataStreamWriter, formatDataStreamPart } from 'ai';
import createDebug from 'debug';
import { isReasoningModel } from '../../provider';
import { query } from '../../query';
import { Service } from '../../service';
import { delay } from '../../utils/delay';
import {
  AttachmentItem,
  ContextItem,
  ContextType,
  ImageItem,
} from '../types/completions';
import { CreateServerOpts } from '../types/server';
import { getToolApprovalService } from './tool-approval';

const debug = createDebug('takumi:server:completions');

interface RunCompletionOpts extends CreateServerOpts {
  dataStream: DataStreamWriter;
  service: Service;
  planService: Service;
  mode: string;
  attachedContexts: ContextItem[];
  abortSignal?: AbortSignal;
}

function isImageContext(context: ContextItem): context is ContextItem & {
  context: ImageItem;
} {
  return context.type === ContextType.IMAGE && !!context.context;
}

function isAttachmentContext(context: ContextItem): context is ContextItem & {
  context: AttachmentItem;
} {
  return (
    context.type === ContextType.ATTACHMENT &&
    !!context.context &&
    !!(context.context as AttachmentItem).url
  );
}

type ContextConverter = (
  context: ContextItem,
) =>
  | { type: 'input_image'; image: string; providerData: { mime_type: string } }
  | { type: 'input_file'; file: string; providerData: { name: string } }
  | null;

const contextConverters: Record<ContextType, ContextConverter> = {
  [ContextType.IMAGE]: (context: ContextItem) => {
    if (!isImageContext(context)) return null;

    const { src, mime } = context.context;
    return {
      type: 'input_image' as const,
      image: src,
      providerData: { mime_type: mime },
    };
  },

  [ContextType.ATTACHMENT]: (context: ContextItem) => {
    if (!isAttachmentContext(context)) return null;

    const { url, name } = context.context;
    if (!url) return null;

    return {
      type: 'input_file' as const,
      file: url,
      providerData: { name },
    };
  },

  [ContextType.FILE]: () => null,
  [ContextType.UNKNOWN]: () => null,
};

function convertUserPromptToAgentInput(
  prompt: string,
  attachedContexts: ContextItem[],
): AgentInputItem[] {
  if (attachedContexts.length === 0) {
    return [
      {
        role: 'user' as const,
        content: prompt,
      },
    ];
  }

  const contextMessages = attachedContexts
    .map((context) => {
      const converter = contextConverters[context.type];
      if (!converter) {
        debug(`Unknown context type: ${context.type}`);
        return null;
      }
      return converter(context);
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return [
    {
      role: 'user' as const,
      content: [
        {
          type: 'input_text',
          text: prompt,
        },
        ...contextMessages,
      ],
    },
  ];
}

export async function runCode(opts: RunCompletionOpts) {
  const { dataStream, mode, attachedContexts, abortSignal } = opts;

  debug('runCode execution started');

  // Check if already cancelled
  if (abortSignal?.aborted) {
    debug('Request already cancelled, not executing runCode');
    debug('Request already aborted before starting');
    throw new Error('Request was cancelled by the client');
  }

  try {
    const input: AgentInputItem[] = convertUserPromptToAgentInput(
      opts.prompt,
      attachedContexts,
    );

    debug('input', JSON.stringify(input, null, 2));

    const service = mode === 'plan' ? opts.planService : opts.service;
    const toolApprovalService = getToolApprovalService(service.context);

    debug('mode', mode);
    debug('Preparing to call query function');
    const result = await query({
      input,
      service,
      thinking: isReasoningModel(service.context.config.model),
      abortSignal,
      onTextDelta(text) {
        debug('Received text increment');
        debug(`Text delta: ${text}`);
        dataStream.writeMessageAnnotation({
          type: 'text_delta',
          text,
        });
      },
      async onText(text) {
        debug('Received complete text');
        dataStream.writeMessageAnnotation({
          type: 'text',
          text,
          mode,
        });
        await delay(10);
        debug(`Text: ${text}`);
        dataStream.write(formatDataStreamPart('text', text));
      },
      onReasoning(text) {
        debug('Received reasoning text');
        debug(`Reasoning: ${text}`);
        dataStream.writeMessageAnnotation({
          type: 'reasoning',
          reasoning: text,
        });
        dataStream.write(formatDataStreamPart('reasoning', text));
      },
      onToolUse(callId, name, params) {
        debug('Tool call started:', name);
        debug(`Tool use: ${name} with params ${JSON.stringify(params)}`);
        dataStream.writeMessageAnnotation({
          type: 'tool_call',
          toolCallId: callId,
          toolName: name,
          args: params,
        });
        dataStream.write(
          formatDataStreamPart('tool_call', {
            toolCallId: callId,
            toolName: name,
            args: params,
          }),
        );
      },
      onToolUseResult(callId, name, result) {
        debug('Tool call result:', name);
        debug(`Tool use result: ${name} with result ${JSON.stringify(result)}`);
        dataStream.writeMessageAnnotation({
          type: 'tool_result',
          toolCallId: callId,
          toolName: name,
          result: result,
        });
        dataStream.write(
          formatDataStreamPart('tool_result', {
            toolCallId: callId,
            result: JSON.stringify(result),
          }),
        );
      },
      async onToolApprove(callId, name, params) {
        debug('Requesting tool approval:', name);
        debug(`Tool approval request: ${name} with callId ${callId}`);

        try {
          // Check if already cancelled
          if (abortSignal?.aborted) {
            debug('Tool approval cancelled because request was aborted');
            debug(
              `Tool approval cancelled for ${callId} due to aborted request`,
            );
            return false;
          }

          dataStream.writeMessageAnnotation({
            type: 'tool_approval_request',
            toolCallId: callId,
            toolName: name,
            args: params,
          });

          // Create an abortable tool approval request
          const approved = await toolApprovalService.requestApproval(
            callId,
            name,
            params,
          );

          debug('Tool approval result:', approved ? 'approved' : 'denied');

          dataStream.writeMessageAnnotation({
            type: 'tool_approval_result',
            toolCallId: callId,
            toolName: name,
            approved,
          });

          debug(
            `Tool approval result: ${name} with callId ${callId}, approved: ${approved}`,
          );
          return approved;
        } catch (error) {
          debug('Tool approval error:', error);
          debug(`Tool approval error: ${name} with callId ${callId}`, error);

          dataStream.writeMessageAnnotation({
            type: 'tool_approval_error',
            toolCallId: callId,
            toolName: name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          return false;
        }
      },
    });

    debug('query function execution completed');
    debug('result', result);

    // Check if result indicates cancellation
    if (result.cancelled) {
      debug('Query was cancelled');
      debug('Query was cancelled');
      throw new DOMException('The operation was aborted', 'AbortError');
    }
  } catch (error) {
    // If error is due to AbortSignal, convert to AbortError
    if (abortSignal?.aborted) {
      debug('Caught cancel signal, converting to AbortError');
      const abortError = new DOMException(
        'The operation was aborted',
        'AbortError',
      );
      throw abortError;
    }
    debug('runCode execution error:', error);
    throw error;
  } finally {
    debug('runCode execution finished');
    // TODO: Cannot destroy here, otherwise it will cause mcp to be unavailable
    // await opts.context.destroy();
  }
}
