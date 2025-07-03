import { LocalCommand } from '../types';

export const clearCommand: LocalCommand = {
  type: 'local',
  name: 'clear',
  description: 'Clear the chat history',
  async call(args: string, context) {
    context.history.length = 0;
    return 'History cleared.';
  },
};
