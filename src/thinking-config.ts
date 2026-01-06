import type { ModelInfo } from './model';

export type ReasoningEffort = 'low' | 'medium' | 'high';

export function getThinkingConfig(
  model: ModelInfo,
  reasoningEffort: ReasoningEffort,
): Record<string, any> | undefined {
  if (!model.model.reasoning) {
    return undefined;
  }

  if (model.provider.id === 'xiaomi') {
    return {
      providerOptions: {
        xiaomi: {
          thinking: {
            type: 'enabled',
          },
        },
      },
    };
  }

  if (model.provider.id === 'xai') {
    return {
      providerOptions: {
        xai: {
          // https://ai-sdk.dev/providers/ai-sdk-providers/xai#provider-options
          // Only supported by grok-3-mini and grok-3-mini-fast models?
          // reasoningEffort: 'low',
        },
      },
    };
  }

  if (['openrouter', 'zenmux', 'wanqing'].includes(model.provider.id)) {
    let effort: ReasoningEffort | undefined = reasoningEffort;
    let budgetTokens = undefined;
    if (effort === 'high') {
      effort = undefined;
      budgetTokens = 31999;
    }
    return {
      providerOptions: {
        [model.provider.id]: {
          reasoning: {
            enabled: true,
            effort,
            max_tokens: budgetTokens,
          },
        },
      },
    };
  }

  if (model.provider.createModelType === 'anthropic' && model.model.reasoning) {
    return {
      providerOptions: {
        anthropic: {
          thinking: {
            type: 'enabled' as const,
            budgetTokens: reasoningEffort === 'low' ? 1024 : 31999,
          },
        },
      },
    };
  }

  if (model.provider.id === 'google') {
    return {
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: reasoningEffort === 'low' ? 1024 : 31999,
            includeThoughts: true,
          },
        },
      },
    };
  }
}
