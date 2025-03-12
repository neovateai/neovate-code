import { createOpenAI } from '@ai-sdk/openai';
import assert from 'assert';

const GROQ_MODELS = [
  'qwen-qwq-32b',
  'deepseek-r1-distill-qwen-32b',
  'deepseek-r1-distill-llama-70b',
] as const;
const DEEPSEEK_MODELS = [
  'deepseek-chat',
  'deepseek-reasoner', // don't support tools
] as const;
const GOOGLE_MODELS = [
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-thinking-exp-01-21', // don't support tools
  'gemini-2.0-pro-exp-02-05',
] as const;

export type ModelType =
  | (typeof GROQ_MODELS)[number]
  | (typeof DEEPSEEK_MODELS)[number]
  | (typeof GOOGLE_MODELS)[number];

export function getModel(model: ModelType) {
  let apiKey;
  let baseURL;
  if (GOOGLE_MODELS.includes(model as any)) {
    apiKey = process.env.GOOGLE_API_KEY;
    baseURL = process.env.GOOGLE_BASE_URL;
  } else if (DEEPSEEK_MODELS.includes(model as any)) {
    apiKey = process.env.DEEPSEEK_API_KEY;
    baseURL = process.env.DEEPSEEK_BASE_URL;
  } else if (GROQ_MODELS.includes(model as any)) {
    apiKey = process.env.GROQ_API_KEY;
    baseURL = process.env.GROQ_BASE_URL;
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }
  assert(apiKey, `apiKey is required for model ${model}`);
  assert(baseURL, `baseURL is required for model ${model}`);
  const openai = createOpenAI({
    apiKey,
    baseURL,
  });
  return openai(model);
}
