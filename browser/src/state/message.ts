import { proxy } from 'valtio';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MessageState {
  messages: Message[];
}

export const state = proxy<MessageState>({
  messages: [],
});

export const actions = {
  addMessage: (message: Message) => {
    state.messages.push(message);
  },
};
