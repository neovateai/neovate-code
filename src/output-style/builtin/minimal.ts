import type { OutputStyle } from '../types';

export const minimalOutputStyle: OutputStyle = {
  name: 'Minimal',
  description: 'Simple and concise for non-coding tasks',
  isCodingRelated: false,
  prompt: `You are a helpful assistant. Be concise and direct. Answer questions clearly without unnecessary elaboration.`,
};
