import type { LanguageModelV1Message } from '@ai-sdk/provider';
import { UserError } from '@openai/agents';
import createDebug from 'debug';

const debug = createDebug('neovate:utils:merge-consecutive-system-messages');

/**
 * @internal
 * Merges consecutive system messages in a LanguageModelV1Message array.
 *
 * This utility is essential for compatibility with AI models like Anthropic Claude
 * and Google Gemini that have restrictions on multiple system messages. These models
 * require system messages to be consolidated into a single message.
 *
 * @see https://github.com/microsoft/autogen/pull/6118
 *
 * @param messages - The array of messages to process
 * @param modelProvider - The model provider identifier (e.g., 'openai.chat', 'anthropic')
 * @param modelId - Optional model ID for specific model requirement checks
 * @returns The processed messages array with consecutive system messages merged
 *
 * @throws {UserError} When non-consecutive system messages are detected for restricted models
 */
export function mergeConsecutiveSystemMessages(
  messages: LanguageModelV1Message[],
  modelProvider: string,
  modelId?: string,
): LanguageModelV1Message[] {
  // Early returns for performance
  if (
    process.env.TAKUMI_MERGE_SYSTEM_MESSAGES !== '1' ||
    messages.length === 0 ||
    !modelId
  ) {
    return messages;
  }

  // Determine if system message merging is required based on model provider and ID
  // Currently applies to: Gemini models via OpenAI provider, and Claude models
  const needsMerging =
    (modelProvider === 'openai.chat' && modelId.includes('gemini')) ||
    modelId.includes('claude');

  debug(
    'mergeConsecutiveSystemMessages',
    modelProvider,
    modelId,
    `needsMerging: ${needsMerging}`,
  );
  if (!needsMerging) {
    return messages;
  }

  if (messages.length === 0) {
    return messages;
  }

  const mergedMessages: LanguageModelV1Message[] = [];
  let consecutiveSystemMessages: LanguageModelV1Message[] = [];

  const flushSystemMessages = () => {
    if (consecutiveSystemMessages.length === 0) return;

    if (consecutiveSystemMessages.length === 1) {
      mergedMessages.push(consecutiveSystemMessages[0]);
    } else {
      // Merge consecutive system messages
      const mergedContent = consecutiveSystemMessages
        .map((msg) => msg.content)
        .join('\n\n');

      // Use the provider metadata from the first system message
      const firstSystemMessage = consecutiveSystemMessages[0];
      mergedMessages.push({
        role: 'system',
        content: mergedContent,
        providerMetadata: firstSystemMessage.providerMetadata,
      });
    }
    consecutiveSystemMessages = [];
  };

  let hasSeenNonSystemMessage = false;

  for (const message of messages) {
    if (message.role === 'system') {
      if (hasSeenNonSystemMessage) {
        // Non-consecutive system message detected - throw error
        const modelType = `${modelId} (via ${modelProvider})`;
        throw new UserError(
          `Non-consecutive system messages are not supported for ${modelType} models. ` +
            'System messages must appear consecutively at the beginning of the conversation.',
        );
      }
      consecutiveSystemMessages.push(message);
    } else {
      hasSeenNonSystemMessage = true;
      flushSystemMessages();
      mergedMessages.push(message);
    }
  }

  // Flush any remaining system messages
  flushSystemMessages();

  debug('mergeConsecutiveSystemMessages: mergedMessages', mergedMessages);

  return mergedMessages;
}
