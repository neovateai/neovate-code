import type { Context } from '../../context';
import type { MessageBus } from '../../messageBus';
import {
  type Model,
  type Provider,
  resolveModelWithContext,
} from '../../provider/model';
import { query } from '../../query';

type ModelData = Omit<Model, 'id' | 'cost'>;

export function registerModelsHandlers(
  messageBus: MessageBus,
  getContext: (cwd: string) => Promise<Context>,
  clearContext: (cwd: string) => Promise<void>,
) {
  messageBus.registerHandler('models.list', async (data) => {
    const { cwd } = data;
    const context = await getContext(cwd);
    const { providers, model } = await resolveModelWithContext(null, context);
    const currentModel = model;
    const currentModelInfo =
      model?.provider && model?.model
        ? {
            providerName: model.provider.name,
            modelName: model.model.name,
            modelId: model.model.id,
            modelContextLimit: model.model.limit.context,
          }
        : null;

    let thinkingLevel: string | undefined = undefined;
    const variants = currentModel?.model.variants;
    if (variants && Object.keys(variants).length > 0) {
      const availableEfforts = Object.keys(variants);
      const configuredLevel = context.config.thinkingLevel;

      let targetLevel: string | undefined = configuredLevel;
      if (configuredLevel === 'maxOrXhigh') {
        targetLevel = availableEfforts.includes('xhigh')
          ? 'xhigh'
          : availableEfforts.includes('max')
            ? 'max'
            : undefined;
      }

      if (targetLevel && availableEfforts.includes(targetLevel)) {
        thinkingLevel = targetLevel;
      } else {
        thinkingLevel = availableEfforts[0];
      }
    }

    const nullModels: { providerId: string; modelId: string }[] = [];
    const isProviderActive = (provider: Provider): boolean => {
      if (provider.options?.apiKey) return true;
      const envs = provider.env || [];
      return envs.some((envName) => !!process.env[envName]);
    };
    const groupedModels = Object.values(
      providers as Record<string, Provider>,
    ).map((provider) => {
      const isActive = isProviderActive(provider);
      return {
        provider: provider.name,
        providerId: provider.id,
        isActive,
        models: Object.entries(provider.models || {})
          .filter(([modelId, model]) => {
            if (model == null) {
              nullModels.push({ providerId: provider.id, modelId });
              return false;
            }
            return true;
          })
          .map(([modelId, model]) => ({
            name: (model as ModelData).name,
            modelId: modelId,
            value: `${provider.id}/${modelId}`,
          })),
      };
    });
    return {
      success: true,
      data: {
        groupedModels,
        currentModel,
        currentModelInfo,
        nullModels,
        recentModels: context.globalData.getRecentModels(),
        recentModelsLimit: context.config.recentModels ?? 10,
        thinkingLevel,
      },
    };
  });

  messageBus.registerHandler('models.test', async (data) => {
    const { model: modelStr } = data;
    const cwd = data.cwd || require('os').tmpdir();
    const timeout = data.timeout ?? 15000;
    const prompt = data.prompt ?? 'hi';
    const useTempContext = !data.cwd;
    try {
      const context = await getContext(cwd);
      const { model, error } = await resolveModelWithContext(modelStr, context);

      if (error || !model) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Model not found',
        };
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Model test timed out after ${timeout}ms`)),
          timeout,
        );
      });

      const startTime = Date.now();
      const result = await Promise.race([
        query({
          userPrompt: prompt,
          model,
          systemPrompt: '',
          thinking: false,
        }),
        timeoutPromise,
      ]);
      const responseTime = Date.now() - startTime;

      if (useTempContext) {
        await clearContext(cwd);
      }

      if (!result.success) {
        return {
          success: false,
          error: result.error?.message || 'Model test failed',
        };
      }

      return {
        success: true,
        data: {
          model: modelStr,
          provider: model.provider.name,
          modelName: model.model.name,
          prompt,
          response: result.data?.text || '',
          responseTime,
          usage: result.data?.usage || null,
        },
      };
    } catch (error: any) {
      if (useTempContext) {
        await clearContext(cwd).catch(() => {});
      }
      return {
        success: false,
        error: error.message || 'Failed to test model',
      };
    }
  });

  messageBus.registerHandler('models.getVariants', async (data) => {
    const { model: modelStr } = data;
    const cwd = data.cwd || process.cwd();
    try {
      const context = await getContext(cwd);
      const { model, error } = await resolveModelWithContext(modelStr, context);
      if (error || !model) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Model not found',
        };
      }
      return {
        success: true,
        data: {
          model: modelStr,
          variants: model.model.variants || {},
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get model variants',
      };
    }
  });
}
