import path from 'path';
import { JsonlLogger } from '../../jsonl';
import { type Plugin } from '../../plugin';

type CreateJsonlPluginOpts = {
  baseDir: string;
  cwd: string;
  version: string;
};

export const createJsonlPlugin = (opts: CreateJsonlPluginOpts): Plugin => {
  const cachedJsonlLogger = new Map<string, JsonlLogger>();
  function getJsonlLogger(sessionId: string) {
    if (cachedJsonlLogger.has(sessionId)) {
      return cachedJsonlLogger.get(sessionId)!;
    }
    const filePath = path.join(opts.baseDir, sessionId + '.jsonl');
    const jsonlLogger = new JsonlLogger({
      filePath,
      sessionId,
      cwd: opts.cwd,
      version: opts.version,
    });
    cachedJsonlLogger.set(sessionId, jsonlLogger);
    return jsonlLogger;
  }

  return {
    name: 'jsonl',
    userPrompt(opts) {
      getJsonlLogger(opts.sessionId).writeUserMessage(opts.text);
    },
    text(opts) {
      getJsonlLogger(opts.sessionId).writeAssistantMessage([
        {
          type: 'text',
          text: opts.text,
        },
      ]);
    },
    toolUse(opts) {
      getJsonlLogger(opts.sessionId).writeAssistantMessage([
        {
          type: 'tool_use',
          name: opts.toolUse.name,
          id: opts.toolUse.callId,
          input: opts.toolUse.params,
        },
      ]);
    },
    // query(opts) {
    //   const messages: any = opts.parsed.map((item) => {
    //     if (item.type === 'tool_use') {
    //       return {
    //         type: 'tool_use',
    //         name: item.name,
    //         id: item.callId,
    //         input: item.params,
    //       };
    //     } else {
    //       return {
    //         type: 'text',
    //         text: item.content,
    //       };
    //     }
    //   });
    //   getJsonlLogger(opts.sessionId).writeAssistantMessage(messages, {
    //     model: opts.model,
    //     usage: {
    //       input_tokens: opts.usage.inputTokens,
    //       output_tokens: opts.usage.outputTokens,
    //     },
    //   });
    // },
    toolUseResult(opts) {
      getJsonlLogger(opts.sessionId).writeToolResult(
        opts.toolUse.callId,
        opts.result?.message || JSON.stringify(opts.result),
        opts.result?.success === false,
      );
    },
    async destroy() {
      const loggers = cachedJsonlLogger.values();
      for (const logger of loggers) {
        await logger.close();
      }
      cachedJsonlLogger.clear();
    },
  };
};
