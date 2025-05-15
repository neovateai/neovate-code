import {
  CoreMessage,
  LanguageModelUsage,
  Tool,
  generateText,
  streamText,
} from 'ai';
import assert from 'assert';
import { randomUUID } from 'crypto';
import { getContext } from '../context/context';
import { getClientsTools } from '../mcp';
import { PluginHookType } from '../pluginManager/pluginManager';
import { getToolsPrompt } from '../prompts/prompts';
import { callTool, getAllTools, parseToolUse } from '../tools/tools';
import { getAskTools } from '../tools/tools';
import { Context } from '../types';
import * as logger from '../utils/logger';
import { renderMarkdown } from '../utils/markdown';
import { ModelType, getModel } from './model';

export interface AskQueryOptions {
  context: Context;
  prompt?: string;
  messages?: CoreMessage[];
  model?: ModelType | ReturnType<typeof getModel>;
  systemPrompt?: string[];
}

export async function askQuery(opts: AskQueryOptions) {
  const tools: any = {
    ...(process.env.CODE === 'none'
      ? {}
      : await getAskTools({ context: opts.context })),
    ...(await getClientsTools(opts.context.mcpClients)),
  };

  await opts.context.pluginManager.apply({
    hook: 'contextStart',
    args: [{ prompt: opts.prompt }],
    type: PluginHookType.Series,
    pluginContext: opts.context.pluginContext,
  });

  const queryContext =
    process.env.CODE === 'none'
      ? {}
      : await getContext({
          context: opts.context,
          prompt: opts.prompt,
        });
  return await query({
    ...opts,
    model: opts.model,
    systemPrompt: opts.systemPrompt || opts.context.config.systemPrompt,
    queryContext,
    tools,
  });
}

export interface EditQueryOptions {
  context: Context;
  prompt: string;
  model?: ModelType | ReturnType<typeof getModel>;
  systemPrompt?: string[];
}

export async function editQuery(opts: EditQueryOptions) {
  const tools = {
    ...(process.env.CODE === 'none'
      ? {}
      : await getAllTools({ context: opts.context })),
    ...(await getClientsTools(opts.context.mcpClients)),
  };

  await opts.context.pluginManager.apply({
    hook: 'contextStart',
    args: [{ prompt: opts.prompt }],
    type: PluginHookType.Series,
    pluginContext: opts.context.pluginContext,
  });

  let queryContext =
    process.env.CODE === 'none'
      ? {}
      : await getContext({
          context: opts.context,
          prompt: opts.prompt,
        });

  queryContext = await opts.context.pluginManager.apply({
    hook: 'context',
    type: PluginHookType.SeriesMerge,
    args: [{ prompt: opts.prompt }],
    memo: queryContext,
    pluginContext: opts.context.pluginContext,
  });

  return await query({
    ...opts,
    model: opts.model,
    systemPrompt: opts.systemPrompt || opts.context.config.systemPrompt,
    queryContext,
    tools,
  });
}

interface QueryOptions {
  model?: ModelType | ReturnType<typeof getModel>;
  prompt?: string;
  messages?: CoreMessage[];
  systemPrompt: string[];
  queryContext: Record<string, any>;
  tools: Record<string, Tool>;
  context: Context;
}

export async function query(opts: QueryOptions) {
  assert(opts.messages || opts.prompt, 'prompt or messages is required');
  const start = Date.now();
  const id = randomUUID();
  let model = opts.model || opts.context.config.model;
  model =
    typeof model === 'string'
      ? getModel(model, opts.context.config.apiKeys)
      : model;
  const { prompt, systemPrompt, queryContext, tools, context } = opts;
  const messages: CoreMessage[] = opts.messages || [];
  const hasTools = Object.keys(tools).length > 0;
  const system = [
    ...systemPrompt.map((prompt) => {
      return prompt.replace(/\{language\}/g, context.config.language);
    }),
    ...(hasTools ? [getToolsPrompt(tools)] : []),
    `====\n\nCONTEXT\n\nAs you answer the user's questions, you can use the following context:`,
    ...Object.entries(queryContext).map(
      ([key, value]) => `<context name="${key}">${value}</context>`,
    ),
  ].join('\n');
  async function addMessage(newMessages: CoreMessage[]) {
    messages.push(...newMessages);
    // hook: message
    await opts.context.pluginManager.apply({
      hook: 'message',
      args: [{ messages: newMessages, queryId: id }],
      type: PluginHookType.Series,
      pluginContext: opts.context.pluginContext,
    });
  }
  // hook: queryStart
  await opts.context.pluginManager.apply({
    hook: 'queryStart',
    args: [{ prompt: opts.prompt, id, system, tools }],
    type: PluginHookType.Series,
    pluginContext: opts.context.pluginContext,
  });
  if (!opts.messages && prompt) {
    await addMessage([{ role: 'user', content: prompt }]);
  }
  while (true) {
    const generationId = randomUUID();
    const thinkDone = logger.spinThink({
      productName: context.config.productName,
    });
    logger.logDebug(`Messages: ${JSON.stringify(messages, null, 2)}`);
    const llmOpts = {
      model,
      messages,
      system,
    };
    let text = '';
    let tokenUsageForLog: LanguageModelUsage | null = null;
    if (context.config.stream) {
      const result = await streamText(llmOpts);
      text = '';
      let think = null;
      for await (const chunk of result.textStream) {
        if (!think) {
          thinkDone();
          // think = logger.logThink({ productName: context.config.productName });
          think = logger.logThinkWithMarkdown({
            productName: context.config.productName,
          });
        }
        text += chunk;
        if (text.includes('<') || text.includes('<use_tool>')) {
        } else {
          think.text(chunk);
          // process.stdout.write(chunk);
        }
        // if (chunk.includes('<') || tmpText.length) {
        //   tmpText += chunk;
        //   if (tmpText.includes('>')) {
        //     if (!tmpText.includes('<use_tool>')) {
        //       process.stdout.write(tmpText);
        //     }
        //     text += tmpText;
        //     tmpText = '';
        //   }
        // } else {
        //   if (!text.includes('<use_tool>')) {
        //     process.stdout.write(chunk);
        //   }
        // }
      }
      tokenUsageForLog = await result.usage;
      // process.stdout.write('\n');
    } else {
      const result = await generateText(llmOpts);
      thinkDone();
      const renderedText = renderMarkdown(result.text);
      logger
        .logThink({ productName: context.config.productName })
        .text(renderedText);
      text = result.text;
      tokenUsageForLog = await result.usage;
    }
    if (context.argv.printTokenUsage) {
      logger.logUsage({
        promptTokens: tokenUsageForLog?.promptTokens,
        completionTokens: tokenUsageForLog?.completionTokens,
        totalTokens: tokenUsageForLog?.totalTokens,
        generationId,
      });
    }
    // hook: query
    await opts.context.pluginManager.apply({
      hook: 'query',
      args: [
        {
          prompt,
          text,
          id,
          tools,
          tokenUsage: tokenUsageForLog,
          generationId,
        },
      ],
      type: PluginHookType.Series,
      pluginContext: opts.context.pluginContext,
    });
    const { toolUse } = parseToolUse(text);
    if (toolUse) {
      await addMessage([{ role: 'assistant', content: text }]);
      // logTool(
      //   `Tool ${pc.bold(toolUse.toolName)} called with args: ${JSON.stringify(toolUse.arguments)}`,
      // );
      const toolLogger = logger.logTool({ toolUse });
      const toolResult = await callTool(tools, toolUse, id, context);
      const result =
        typeof toolResult === 'string'
          ? toolResult
          : JSON.stringify(toolResult);
      toolLogger.result(result);
      await addMessage([{ role: 'user', content: result }]);
    } else {
      const end = Date.now();
      // hook: queryEnd
      await opts.context.pluginManager.apply({
        hook: 'queryEnd',
        args: [
          {
            prompt,
            systemPrompt,
            queryContext,
            tools,
            messages,
            startTime: start,
            endTime: end,
            text,
            id,
          },
        ],
        type: PluginHookType.Series,
        pluginContext: opts.context.pluginContext,
      });
      return text;
    }
  }
}
