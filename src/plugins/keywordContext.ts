import { Plugin } from '../pluginManager/types';
import { PluginContext } from '../types';
import * as logger from '../utils/logger';

export const keywordContextPlugin: Plugin = {
  name: 'keyword-context-plugin',
  contextStart(this: PluginContext, { prompt }) {
    if (!prompt) {
      return;
    }

    if (prompt.includes('@codebase')) {
      logger.logDebug(
        `[keyword-context] Detected project-related keywords, will automatically add project context`,
      );

      if (!this.argv.codebase) {
        this.argv.codebase = true;
        logger.logInfo(`[keyword-context] Codebase context analysis enabled`);
      }
    }
  },
};
