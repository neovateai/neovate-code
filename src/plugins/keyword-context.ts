import { Plugin } from '../pluginManager/types';
import { PluginContext } from '../types';
import { logDebug, logInfo } from '../utils/logger';

export const keywordContextPlugin: Plugin = {
  name: 'keyword-context-plugin',
  contextStart(this: PluginContext, { prompt }) {
    if (!prompt) {
      return;
    }

    if (prompt.includes('@codebase')) {
      logDebug(
        `[keyword-context] Detected project-related keywords, will automatically add project context`,
      );

      if (!this.argv.codebase) {
        this.argv.codebase = true;
        logInfo(`[keyword-context] Codebase context analysis enabled`);
      }
    }
  },
};
