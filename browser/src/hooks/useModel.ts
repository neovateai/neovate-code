import { createOpenAI } from '@ai-sdk/openai';
import * as context from '@/state/context';

export const useModel = () => {
  const openai = createOpenAI({
    baseURL: '/api',
    apiKey: 'TAKUMI',
    fetch(url, params: any) {
      const body = JSON.parse(params.body);
      return fetch(url, {
        ...params,
        body: JSON.stringify({
          ...body,
          contexts: {
            ...context.state.contexts,
          },
        }),
      });
    },
  });

  const model = openai('takumi');

  return {
    model,
  };
};
