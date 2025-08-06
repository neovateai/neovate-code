import { JsonlLogger } from '../jsonl';
import { Plugin } from '../plugin';
import { relativeToHome } from '../utils/path';

type CreateJsonlPluginOpts = {
  filePath: string;
  cwd: string;
  version: string;
  gitBranch?: string;
};

export const createJsonlPlugin = (opts: CreateJsonlPluginOpts) => {
  const jsonlLogger = new JsonlLogger({
    filePath: opts.filePath,
    cwd: opts.cwd,
    version: opts.version,
    gitBranch: opts.gitBranch,
  });
  return {
    name: 'jsonl',
    userMessage(opts) {
      jsonlLogger.writeUserMessage(opts.text);
    },
    query(opts) {
      const messages: any = opts.parsed.map((item) => {
        if (item.type === 'tool_use') {
          return {
            type: 'tool_use',
            name: item.name,
            id: item.callId,
            input: item.params,
          };
        } else {
          return {
            type: 'text',
            text: item.content,
          };
        }
      });
      jsonlLogger.writeAssistantMessage(messages, {
        model: opts.model,
        usage: {
          input_tokens: opts.usage.inputTokens,
          output_tokens: opts.usage.outputTokens,
        },
      });
    },
    toolResult(result, opts) {
      try {
        const isError = result?.success === false;
        jsonlLogger.writeToolResult(
          opts.callId,
          result?.message || JSON.stringify(result),
          isError,
        );
      } catch (err) {}
      return result;
    },
    async destroy() {
      await jsonlLogger.close();
    },
  } as Plugin;
};
