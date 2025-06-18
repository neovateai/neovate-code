import { AgentConfiguration, AgentInputItem, withTrace } from '@openai/agents';
import { DataStreamWriter, formatDataStreamPart } from 'ai';
import assert from 'assert';
import createDebug from 'debug';
import { Context } from '../../v2/context';
import { isReasoningModel } from '../../v2/provider';
import { query } from '../../v2/query';
import { Service, ServiceOpts } from '../../v2/service';
import { PLAN_PROMPT_JSON } from '../prompts';
import { CreateServerOpts } from '../types/server';

const debug = createDebug('takumi:server:completions');

interface BrowserServiceOpts
  extends ServiceOpts,
    Omit<CreateServerOpts, 'argvConfig'> {}

export class BrowserService extends Service {
  constructor(opts: BrowserServiceOpts) {
    const context = new Context({
      productName: opts.productName,
      cwd: opts.cwd,
      argvConfig: opts.argvConfig,
    });

    super({
      context,
      ...opts,
    });
  }

  modifyAgent(opts: Partial<AgentConfiguration>) {
    this.agent = this.agent?.clone(opts);
    debug('modify agent', opts);
  }
}

interface RunCompletionOpts extends CreateServerOpts {
  dataStream: DataStreamWriter;
}

export async function runPlan(opts: RunCompletionOpts) {
  const services: Service[] = [];
  const { dataStream } = opts;

  return await withTrace(opts.traceName, async () => {
    try {
      const service = new BrowserService({
        ...opts,
        agentType: 'plan',
      });
      services.push(service);

      let input: AgentInputItem[] = [
        {
          role: 'user' as const,
          content: opts.prompt,
        },
      ];
      const result = await query({
        input,
        service,
        thinking: isReasoningModel(service.context.configManager.config.model),
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
      await Promise.all(services.map((service) => service.destroy()));
    }
  });
}

export async function runCode(opts: RunCompletionOpts) {
  const services: Service[] = [];
  const { dataStream } = opts;

  return await withTrace(opts.traceName, async () => {
    try {
      const service = new BrowserService({
        ...opts,
        agentType: 'code',
      });
      services.push(service);

      let input: AgentInputItem[] = [
        {
          role: 'user' as const,
          content: opts.prompt,
        },
      ];

      const result = await query({
        input,
        service,
        thinking: isReasoningModel(service.context.configManager.config.model),
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
      debug('result', result);
    } finally {
      await Promise.all(services.map((service) => service.destroy()));
    }
  });
}
