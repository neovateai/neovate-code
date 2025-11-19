import type { ModelInfo } from './model';

export function getThinkingConfig(
  model: ModelInfo,
  reasoningEffort: 'low' | 'medium' | 'high',
): Record<string, any> | undefined {
  if (!model.model.reasoning) {
    return undefined;
  }

  if (['openrouter', 'zenmux'].includes(model.provider.id)) {
    let effort: 'low' | 'medium' | 'high' | undefined = reasoningEffort;
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

  if (
    model.model.id.startsWith('claude-') ||
    model.model.id.startsWith('anthropic/')
  ) {
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
