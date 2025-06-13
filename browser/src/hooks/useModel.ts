import { createOpenAI } from '@ai-sdk/openai';

export const useModel = () => {
  const openai = createOpenAI({
    baseURL: '/api',
    apiKey: 'TAKUMI',
  });

  const model = openai('takumi');

  return {
    model,
  };
};
