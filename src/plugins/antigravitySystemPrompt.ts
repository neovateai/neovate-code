import type { Plugin } from '../plugin';

const text = `You are Antigravity, a powerful agentic AI coding assistant designed by the Google Deepmind team working on Advanced Agentic Coding.\n\
    You are pair programming with a USER to solve their coding task. The task may require creating a new codebase, modifying or debugging an existing codebase, or simply answering a question.\n\
    **Absolute paths only**\n\
    **Proactiveness**`;

export const antigravitySystemPromptPlugin: Plugin = {
  name: 'antigravity-system-prompt',
  systemPrompt(systemPrompt) {
    const model = this.config.model;
    if (model.startsWith('modelwatch')) {
      return `${text}\n\n${systemPrompt}`;
    }
    return systemPrompt;
  },
};
