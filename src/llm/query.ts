import { CoreMessage, Tool, generateText, streamText } from 'ai';
import pc from 'picocolors';
import { getContext } from '../context/context';
import { getClientsTools } from '../mcp';
import { getToolsPrompt } from '../prompts/prompts';
import { callTool, getAllTools, parseToolUse } from '../tools/tools';
import { getAskTools } from '../tools/tools';
import { Context } from '../types';
import { logAction, logDebug, logTool } from '../utils/logger';
import { ModelType, getModel } from './model';

interface AskQueryOptions {
  context: Context;
  prompt: string;
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
  const queryContext =
    process.env.CODE === 'none'
      ? {}
      : await getContext({
          context: opts.context,
        });
  return await query({
    ...opts,
    model: opts.model,
    systemPrompt: opts.systemPrompt || opts.context.config.systemPrompt,
    queryContext,
    tools,
  });
}

interface EditQueryOptions {
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
  const queryContext =
    process.env.CODE === 'none'
      ? {}
      : await getContext({
          context: opts.context,
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
  prompt: string;
  systemPrompt: string[];
  queryContext: Record<string, any>;
  tools: Record<string, Tool>;
  context: Context;
}

export async function query(opts: QueryOptions) {
  let model = opts.model || opts.context.config.model;
  model = typeof model === 'string' ? getModel(model) : model;
  const { prompt, systemPrompt, queryContext, tools, context } = opts;
  console.log();
  const messages: CoreMessage[] = [{ role: 'user', content: prompt }];
  while (true) {
    logAction(`Asking model... (with ${messages.length} messages)`);
    logDebug(`Messages: ${JSON.stringify(messages, null, 2)}`);
    const hasTools = Object.keys(tools).length > 0;
    const system = [
      ...systemPrompt,
      ...(hasTools ? getToolsPrompt(tools) : []),
      `====\n\nCONTEXT\n\nAs you answer the user's questions, you can use the following context:`,
      ...Object.entries(queryContext).map(
        ([key, value]) => `<context name="${key}">${value}</context>`,
      ),
    ].join('\n');
    const llmOpts = {
      model,
      messages,
      system,
    };
    let text = '';
    if (context.config.stream) {
      const result = await streamText(llmOpts);
      text = '';
      // let tmpText = '';
      for await (const chunk of result.textStream) {
        text += chunk;
        if (text.includes('<') || text.includes('<use_tool>')) {
        } else {
          process.stdout.write(chunk);
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
    } else {
      const result = await generateText(llmOpts);
      console.log(result.text);
      text = result.text;
    }
    const { toolUse } = parseToolUse(text);
    if (toolUse) {
      messages.push({ role: 'assistant', content: text });
      logTool(
        `Tool ${pc.bold(toolUse.toolName)} called with args: ${JSON.stringify(toolUse.arguments)}`,
      );
      const toolResult = await callTool(tools, toolUse);
      messages.push({ role: 'user', content: JSON.stringify(toolResult) });
    } else {
      return text;
    }
  }
}
