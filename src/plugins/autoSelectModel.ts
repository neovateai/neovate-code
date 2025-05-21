import { AUTO_SELECT_MODELS, ModelType } from '../llms/model';
import { Plugin } from '../pluginManager/types';
import { PluginContext } from '../types';

export const autoSelectModelPlugin: Plugin = {
  name: 'autoSelectModel',
  enforce: 'post',

  configResolved: async function (this: PluginContext, { resolvedConfig }) {
    if (!resolvedConfig.model) {
      const model = (() => {
        // Fallback to the first model in AUTO_SELECT_MODELS for which the API key is set
        for (const [apiKeyEnvName, modelName] of AUTO_SELECT_MODELS) {
          if (process.env[apiKeyEnvName]) {
            this.logger.logWarn(
              `Using model '${modelName}' as model is not specified but '${apiKeyEnvName}' is set.`,
            );
            return modelName as ModelType;
          }
        }
      })();
      if (model) {
        resolvedConfig.model = model;
        if (!resolvedConfig.smallModel) {
          resolvedConfig.smallModel = model;
        }
      }
    }
  },
};
