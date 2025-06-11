import { Plugin } from '../pluginManager/types';
import { PluginContext } from '../types';

export const browserPlugin: Plugin = {
  name: 'browser',
  async cliStart(this: PluginContext) {
    console.log('browser cliStart');
  },
};
