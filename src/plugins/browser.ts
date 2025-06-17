import { getFileContext } from '../context/contextFiles';
import { Plugin } from '../pluginManager/types';
import { PluginContext } from '../types';

interface BrowserContext extends PluginContext {
  contexts: {
    files: {
      path: string;
      type: string;
    }[];
  };
}

export const browserPlugin: Plugin = {
  name: 'browser',

  async browserStart(this: BrowserContext, { body, contexts }) {
    this.contexts = contexts;
  },

  async context(this: BrowserContext) {
    if (Object.keys(this.contexts).length === 0) {
      return;
    }

    const files = await getFileContext(
      this.contexts.files.map((item) => item.path),
    );

    return {
      files,
    };
  },

  async streamTextUpdate(this: PluginContext, { chunk, queryId }) {
    this.eventManager.sendToStream({
      type: 'text-delta',
      content: chunk,
      metadata: {
        queryId,
      },
    });
  },

  async toolCall(this: PluginContext, { toolName, args, result, queryId }) {
    this.eventManager.sendToStream({
      type: 'tool-call',
      content: {
        toolName,
        args,
        result,
      },
      metadata: {
        queryId,
      },
    });
  },
};
