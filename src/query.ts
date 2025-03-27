import { CoreMessage, Tool, generateText, streamText } from 'ai';
import { logAction, logDebug, logInfo } from './logger';
import { ModelType, getModel } from './model';

interface QueryOptions {
  messages: CoreMessage[];
  systemPrompt: string[];
  context: Record<string, any>;
  model: ModelType;
  tools: Record<string, Tool>;
  stream?: boolean;
  outputStream?: boolean;
}

const MAX_QUERY_WITH_TOOLS_STEPS = 5;

export async function queryWithTools(opts: QueryOptions) {
  const messages = opts.messages;
  let results = [];
  let steps = 0;
  while (true) {
    const result = await query(opts);
    results.push(result);

    steps++;
    if (steps > MAX_QUERY_WITH_TOOLS_STEPS) {
      return {
        results,
        lastResult: result,
      };
    }

    let toolCalls: string[] = [];
    for (const step of result.steps) {
      if (step.text.length > 0) {
        messages.push({ role: 'assistant', content: step.text });
      }
      if (step.toolCalls.length > 0) {
        toolCalls.push(...step.toolCalls.map((toolCall) => toolCall.toolName));
        messages.push({ role: 'assistant', content: step.toolCalls });
      }
      if (step.toolResults.length > 0) {
        messages.push({ role: 'tool', content: step.toolResults });
      }
    }

    if (toolCalls.length > 0) {
      logDebug(`Tools called: ${toolCalls.join(', ')}`);
    } else {
      logInfo(`${result.text}`);
      return {
        results,
        lastResult: result,
      };
    }
  }
}

export async function query(opts: QueryOptions) {
  let {
    messages,
    systemPrompt,
    context,
    tools,
    stream = false,
    outputStream = false,
  } = opts;
  const model = getModel(opts.model);
  console.log();
  logAction(`Asking model... (with ${messages.length} messages)`);
  logDebug(`>>> Messages: ${JSON.stringify(messages, null, 2)}`);
  const system = [
    ...systemPrompt,
    `As you answer the user's questions, you can use the following context:`,
    ...Object.entries(context).map(
      ([key, value]) => `<context name="${key}">${value}</context>`,
    ),
  ].join('\n');
  if (stream) {
    const result = await streamText({
      model,
      messages,
      system,
      tools,
    });
    for await (const text of result.textStream) {
      if (outputStream) {
        process.stdout.write(text + '\n');
      }
    }
    const finalResult = {
      steps: await result.steps,
      toolCalls: await result.toolCalls,
      toolResults: await result.toolResults,
      text: await result.text,
    };
    logDebug(`>>> Query Result: ${JSON.stringify(finalResult, null, 2)}`);
    return finalResult;
  } else {
    const result = await generateText({
      model,
      messages,
      system,
      tools,
    });
    logDebug(`>>> Query Result: ${JSON.stringify(result, null, 2)}`);
    return result;
  }
}
