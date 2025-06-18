import { AgentInputItem, withTrace } from '@openai/agents';
import { DataStreamWriter, createDataStream, formatDataStreamPart } from 'ai';
import assert from 'assert';
import createDebug from 'debug';
import { Context } from '../../v2/context';
import { isReasoningModel } from '../../v2/provider';
import { query } from '../../v2/query';
import { Service } from '../../v2/service';
import { CreateServerOpts } from '../types';

const debug = createDebug('takumi:server:completions');

export async function createCompletionResponse(opts: CreateServerOpts) {
  createDataStream({
    async execute(dataStream) {
      await runCompletion({
        ...opts,
        dataStream,
      });
    },
    onError(error) {
      return error instanceof Error ? error.message : String(error);
    },
  });
}

interface RunCompletionOpts extends CreateServerOpts {
  dataStream: DataStreamWriter;
}

export async function runCompletion(opts: RunCompletionOpts) {
  const services: Service[] = [];
  const { dataStream } = opts;

  return await withTrace(opts.traceName, async () => {
    let prompt = opts.prompt;
    debug('prompt', prompt);

    const context = new Context({
      productName: opts.productName,
      cwd: opts.cwd,
      argvConfig: opts.argvConfig,
    });
    const commonServiceOpts = {
      cwd: opts.cwd,
      context,
      modelProvider: opts.modelProvider,
    };

    const service = new Service({
      agentType: 'plan',
      ...commonServiceOpts,
    });
    services.push(service);
    let input: AgentInputItem[] = [
      {
        role: 'user' as const,
        content: prompt,
      },
    ];

    while (true) {
      debug('querying plan', input);
      console.log(`Here is ${service.context.productName}'s plan:`);
      console.log('-------------');
      let isThinking = false;
      const { finalText: plan } = await query({
        input,
        service,
        thinking: isReasoningModel(
          service.context.configManager.config.planModel,
        ),
        onTextDelta(text) {
          dataStream.write(formatDataStreamPart('text', text));
          process.stdout.write(text);
        },
        onText() {
          process.stdout.write('\n');
        },
        onReasoning(text) {
          if (!isThinking) {
            isThinking = true;
            process.stdout.write('\nThinking:\n');
          }
          dataStream.write(formatDataStreamPart('reasoning', text));
          process.stdout.write(text);
        },
        onToolUse(callId, name, params) {
          console.log(
            `Tool use: ${name} with params ${JSON.stringify(params)}`,
          );
          dataStream.write(
            formatDataStreamPart('tool_call', {
              toolCallId: callId,
              toolName: name,
              args: params,
            }),
          );
        },
        onToolUseResult(callId, name, result) {
          console.log(
            `Tool use result: ${name} with result ${JSON.stringify(result)}`,
          );

          dataStream.write(
            formatDataStreamPart('tool_result', {
              toolCallId: callId,
              result: result,
            }),
          );
          dataStream.writeData({
            type: 'tool_result',
            toolCallId: callId,
            result: result,
          });
        },
      });
      debug('plan', plan);
      assert(plan, `No plan found`);
      dataStream.write(
        formatDataStreamPart('finish_message', {
          finishReason: 'stop',
        }),
      );
      dataStream.writeData({
        type: 'plan',
        content: plan,
      });
      break;
    }
  });
}
