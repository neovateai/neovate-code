import type { LanguageModelMiddleware } from 'ai';

export const prependSystemMessageMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',
  transformParams: async ({ params }) => {
    return {
      ...params,
      prompt: [
        {
          role: 'system' as const,
          content: "You are Claude Code, Anthropic's official CLI for Claude.",
        },
        ...params.prompt,
      ],
    };
  },
};
