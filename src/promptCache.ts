import type { LanguageModelV3Prompt } from '@ai-sdk/provider';
import type { ModelInfo } from './provider/model';

export function addPromptCache(
  prompt: LanguageModelV3Prompt,
  model: ModelInfo,
): LanguageModelV3Prompt {
  const modelId = model.model.id.toLowerCase();
  const providerId = model.provider.id;

  const shouldCache =
    modelId.includes('claude') ||
    modelId.includes('sonnet') ||
    modelId.includes('opus');

  if (!shouldCache) {
    return prompt;
  }

  const providerOptions = {
    anthropic: { cacheControl: { type: 'ephemeral' } },
    openrouter: { cacheControl: { type: 'ephemeral' } },
    bedrock: { cachePoint: { type: 'ephemeral' } },
    openaiCompatible: { cache_control: { type: 'ephemeral' } },
  };

  const system = prompt.filter((msg) => msg.role === 'system').slice(0, 2);
  const nonSystem = prompt.filter((msg) => msg.role !== 'system').slice(-2);
  const toCache = new Set([...system, ...nonSystem]);

  return prompt.map((message) => {
    if (!toCache.has(message)) return message;

    if (
      providerId !== 'anthropic' &&
      Array.isArray(message.content) &&
      message.content.length > 0
    ) {
      const content = [...message.content];
      const last = content[content.length - 1];
      if (last && typeof last === 'object') {
        content[content.length - 1] = {
          ...last,
          providerOptions: { ...last.providerOptions, ...providerOptions },
        };
        return { ...message, content };
      }
    }

    return {
      ...message,
      providerOptions: { ...message.providerOptions, ...providerOptions },
    };
  }) as LanguageModelV3Prompt;
}
