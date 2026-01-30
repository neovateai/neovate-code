import { ApiFormat, type Provider } from './types';

export const googleProvider: Provider = {
  id: 'google',
  source: 'built-in',
  env: ['GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
  apiEnv: ['GOOGLE_GENERATIVE_AI_API_BASE'],
  name: 'Google',
  doc: 'https://ai.google.dev/gemini-api/docs/pricing',
  models: {
    'gemini-2.5-flash': {},
    'gemini-2.5-flash-preview-09-2025': {},
    'gemini-2.5-flash-lite': {},
    'gemini-2.5-pro': {},
    'gemini-3-pro-preview': {},
    'gemini-3-flash-preview': {},
  },
  apiFormat: ApiFormat.Google,
};
