import { AgentInputItem, withTrace } from '@openai/agents';
import { DataStreamWriter, formatDataStreamPart } from 'ai';
import assert from 'assert';
import createDebug from 'debug';
import { isReasoningModel } from '../../provider';
import { query } from '../../query';
import { Service } from '../../service';
import { CreateServerOpts } from '../types/server';

const debug = createDebug('takumi:server:completions');

interface RunCompletionOpts extends CreateServerOpts {
  dataStream: DataStreamWriter;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runPlan(opts: RunCompletionOpts) {
  const { dataStream } = opts;

  return await withTrace(opts.traceName, async () => {
    try {
      const service = await Service.create({
        ...opts,
        agentType: 'plan',
      });

      let input: AgentInputItem[] = [
        {
          role: 'user' as const,
          content: opts.prompt,
        },
      ];
      const result = await query({
        input,
        service,
        thinking: isReasoningModel(service.context.config.model),
        onTextDelta(text) {
          debug(`Text delta: ${text}`);
          dataStream.write(formatDataStreamPart('text', text));
        },
        onReasoning(text) {
          debug(`Reasoning: ${text}`);
          dataStream.write(formatDataStreamPart('reasoning', text));
        },
        onToolUse(callId, name, params) {
          debug(`Tool use: ${name} with params ${JSON.stringify(params)}`);
          dataStream.write(
            formatDataStreamPart('tool_call', {
              toolCallId: callId,
              toolName: name,
              args: params,
            }),
          );
        },
        onToolUseResult(callId, name, result) {
          debug(
            `Tool use result: ${name} with result ${JSON.stringify(result)}`,
          );
          dataStream.write(
            formatDataStreamPart('tool_result', {
              toolCallId: callId,
              result: JSON.stringify(result),
            }),
          );
        },
      });
      assert(result.finalText, 'No plan found');
    } finally {
      await opts.context.destroy();
    }
  });
}

export async function runCode(opts: RunCompletionOpts) {
  const { dataStream } = opts;

  return await withTrace(opts.traceName, async () => {
    try {
      const service = await Service.create({
        ...opts,
        agentType: 'code',
      });

      let input: AgentInputItem[] = [
        {
          role: 'user' as const,
          content: opts.prompt,
        },
      ];

      const result = await query({
        input,
        service,
        thinking: isReasoningModel(service.context.config.model),
        onTextDelta(text) {
          debug(`Text delta: ${text}`);
          dataStream.writeMessageAnnotation({
            type: 'text_delta',
            text,
          });
        },
        async onText(text) {
          dataStream.writeMessageAnnotation({
            type: 'text',
            text,
          });
          await delay(10);
          debug(`Text: ${text}`);
          dataStream.write(formatDataStreamPart('text', text));
        },
        onReasoning(text) {
          debug(`Reasoning: ${text}`);
          dataStream.writeMessageAnnotation({
            type: 'reasoning',
            reasoning: text,
          });
          dataStream.write(formatDataStreamPart('reasoning', text));
        },
        onToolUse(callId, name, params) {
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
          debug(
            `Tool use result: ${name} with result ${JSON.stringify(result)}`,
          );
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
      });
      debug('result', result);
    } finally {
      await opts.context.destroy();
    }
  });
}
