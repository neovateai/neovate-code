import { Plugin } from '../pluginManager/types';
import { PluginContext } from '../types';

export const browserPlugin: Plugin = {
  name: 'browser',

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
