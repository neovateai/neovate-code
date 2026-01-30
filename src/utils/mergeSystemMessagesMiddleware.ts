import type { LanguageModelMiddleware } from 'ai';

export const mergeSystemMessagesMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',
  transformParams: async ({ params }) => {
    const mergedPrompt: typeof params.prompt = [];
    let pendingSystemContent: string[] = [];

    for (const msg of params.prompt) {
      if (msg.role === 'system') {
        pendingSystemContent.push(msg.content);
      } else {
        if (pendingSystemContent.length > 0) {
          mergedPrompt.push({
            role: 'system' as const,
            content: pendingSystemContent.join('\n\n'),
          });
          pendingSystemContent = [];
        }
        mergedPrompt.push(msg);
      }
    }

    if (pendingSystemContent.length > 0) {
      mergedPrompt.push({
        role: 'system' as const,
        content: pendingSystemContent.join('\n\n'),
      });
    }

    return { ...params, prompt: mergedPrompt };
  },
};
