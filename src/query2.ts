import { CoreMessage, Tool, generateText, streamText } from 'ai';
import pc from 'picocolors';
import { getToolsPrompt } from './constants/prompts';
import { logAction, logDebug, logTool } from './logger';
import { deserializeToolName } from './mcp';
import { ModelType, getModel } from './model';
import { callTool, parseToolUse } from './tools';

interface QueryOptions {
  model: ModelType;
  prompt: string;
  systemPrompt: string[];
  context: Record<string, any>;
  tools: Record<string, Tool>;
  stream?: boolean;
}

export async function query(opts: QueryOptions) {
  const model = getModel(opts.model);
  const { prompt, systemPrompt, context, tools, stream } = opts;
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
      ...Object.entries(context).map(
        ([key, value]) => `<context name="${key}">${value}</context>`,
      ),
    ].join('\n');
    const llmOpts = {
      model,
      messages,
      system,
    };
    let text = '';
    if (stream) {
      const result = await streamText(llmOpts);
      text = '';
      // let tmpText = '';
      for await (const chunk of result.textStream) {
        text += chunk;
        if (text.includes("<") || text.includes("<use_tool>")) {
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
        `Tool ${pc.bold(deserializeToolName(toolUse.toolName))} called with args: ${JSON.stringify(toolUse.arguments)}`,
      );
      const toolResult = await callTool(tools, toolUse);
      messages.push({ role: 'user', content: JSON.stringify(toolResult) });
    } else {
      break;
    }
  }
}
