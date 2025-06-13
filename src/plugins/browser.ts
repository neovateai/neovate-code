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
};
