export function getThinkingConfig(
  providerId: string,
  reasoning: boolean,
  modelId: string,
  reasoningEffort: 'low' | 'medium' | 'high',
): Record<string, any> | undefined {
  if (!reasoning) {
    return undefined;
  }

  switch (providerId) {
    case 'anthropic':
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

    case 'google':
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

    default:
      return undefined;
  }
}
