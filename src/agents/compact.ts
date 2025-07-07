import { Agent } from '@openai/agents';

export function createCompactAgent(options: {
  model: string;
  language: string;
}) {
  return new Agent({
    name: 'compact',
    instructions: async () => {
      return `
      You are a helpful AI assistant tasked with summarizing conversations.
      ${
        options.language === 'English'
          ? ''
          : `IMPORTANT: Answer in ${options.language}.
      `
      }
`;
    },
    model: options.model,
  });
}
