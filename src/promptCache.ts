import type { LanguageModelV2Prompt } from '@ai-sdk/provider';
import type { ModelInfo } from './model';

export function addPromptCache(
  prompt: LanguageModelV2Prompt,
  model: ModelInfo,
): LanguageModelV2Prompt {
  const modelId = model.model.id.toLowerCase();
  const shouldCache = modelId.includes('sonnet') || modelId.includes('opus');

  if (!shouldCache) {
    return prompt;
  }

  let systemMessageCount = 0;
  return prompt.map((message) => {
    if (message.role === 'system' && systemMessageCount < 4) {
      systemMessageCount++;
      return {
        ...message,
        providerOptions: {
          ...(message.providerOptions || {}),
          anthropic: {
            ...(message.providerOptions?.anthropic || {}),
            cacheControl: { type: 'ephemeral' },
          },
        },
      };
    }
    return message;
  });
}
