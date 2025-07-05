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
  requestId?: string;
  signal?: AbortSignal;
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
  const { dataStream, mode, attachedContexts, signal } = opts;

  try {
    // 检查是否已经取消
    if (signal?.aborted) {
      debug('Request already aborted before starting');
      dataStream.writeMessageAnnotation({
        type: 'request_canceled',
        message: '请求已被用户取消',
      });
      return;
    }

    const input: AgentInputItem[] = convertUserPromptToAgentInput(
      opts.prompt,
      attachedContexts,
    );

    debug('input', JSON.stringify(input, null, 2));

    const service = mode === 'plan' ? opts.planService : opts.service;
    const toolApprovalService = getToolApprovalService(service.context);

    debug('mode', mode);

    const result = await query({
      input,
      service,
      thinking: isReasoningModel(service.context.config.model),
      signal, // 传递 AbortSignal
      onTextDelta(text) {
        // 检查是否已经取消
        if (signal?.aborted) return;

        debug(`Text delta: ${text}`);
        dataStream.writeMessageAnnotation({
          type: 'text_delta',
          text,
        });
      },
      async onText(text) {
        // 检查是否已经取消
        if (signal?.aborted) return;

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
        // 检查是否已经取消
        if (signal?.aborted) return;

        debug(`Reasoning: ${text}`);
        dataStream.writeMessageAnnotation({
          type: 'reasoning',
          reasoning: text,
        });
        dataStream.write(formatDataStreamPart('reasoning', text));
      },
      onToolUse(callId, name, params) {
        // 检查是否已经取消
        if (signal?.aborted) return;

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
        // 检查是否已经取消
        if (signal?.aborted) return;

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
        // 检查是否已经取消
        if (signal?.aborted) return false;

        debug(`Tool approval request: ${name} with callId ${callId}`);

        try {
          dataStream.writeMessageAnnotation({
            type: 'tool_approval_request',
            toolCallId: callId,
            toolName: name,
            args: params,
          });

          const approved = await toolApprovalService.requestApproval(
            callId,
            name,
            params,
          );

          // 再次检查是否已经取消
          if (signal?.aborted) return false;

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
    debug('result', result);
  } catch (error: unknown) {
    // 检查是否是取消错误
    if (
      (typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'AbortError') ||
      signal?.aborted
    ) {
      debug('Request was canceled');
      dataStream.writeMessageAnnotation({
        type: 'request_canceled',
        message: '请求已被用户取消',
      });
    } else {
      throw error;
    }
  }
}
