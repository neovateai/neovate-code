import { createOpenAI } from '@ai-sdk/openai';
import assert from 'assert';

/**
 * Model Tools Support
 *
^ Platform ^ Model ^ Support ^
| DeepSeek | V3 | ✅ |
| DeepSeek | R1 | ❌ |
| SiliconFlow | V3 | ✅ |
| SiliconFlow | R1 | ❌ |
| Aliyun | V3 | ❌ |
| Aliyun | R1 | ❌ |
| Doubao | V3 | ✅ |
| Doubao | R1 | ✅ |
| Tencent | V3 | ❌ |
| Tencent | R1 | ❌ |
| Groq | qwen-qwq-32b | ✅ |
| Groq | deepseek-r1-distill-qwen-32b | ❌ |
| Groq | deepseek-r1-distill-llama-70b | ✅ |
| Grok | grok-2-1212 | ❌ |
| Gemini | 2.0-flash-001 | ✅ |
| Gemini | 2.0-flash-thinking-exp-01-21 | ❌ |
| Gemini | 2.0-pro-exp-02-05 | ✅ |
| OpenRouter | qwen/qwq-32b | ❌ |
| OpenRouter | openai/gpt-4o-2024-11-20 | ✅ |
| OpenRouter | openai/o1-mini | ❌ |
| OpenRouter | openai/gpt-4-turbo | ✅ |
| OpenRouter | anthropic/claude-3.5-sonnet | ✅ |
*/

const MODELS_ALIAS = {
  'Sili/deepseek-chat': 'Pro/deepseek-ai/DeepSeek-V3',
  'Sili/deepseek-reasoner': 'Pro/deepseek-ai/DeepSeek-R1',
  'Aliyun/deepseek-chat': 'deepseek-v3',
  'Aliyun/deepseek-reasoner': 'deepseek-r1',
  // TODO: model name should be customized
  'Doubao/deepseek-chat': 'ep-20250210151255-r5x5s',
  'Doubao/deepseek-reasoner': 'ep-20250210151757-wvgcj',
  'OpenRouter/qwen/qwq-32b': 'qwen/qwq-32b',
  'OpenRouter/openai/gpt-4o-2024-11-20': 'openai/gpt-4o-2024-11-20',
  'OpenRouter/openai/o1-mini': 'openai/o1-mini',
  'OpenRouter/openai/gpt-4-turbo': 'openai/gpt-4-turbo',
  'OpenRouter/openai/gpt-3.5-turbo-0613': 'openai/gpt-3.5-turbo-0613',
  'OpenRouter/anthropic/claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'Tencent/deepseek-chat': 'deepseek-v3',
  'Tencent/deepseek-reasoner': 'deepseek-r1',
} as const;

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
const SILICONFLOW_MODELS = [
  'Sili/deepseek-chat',
  'Sili/deepseek-reasoner', // don't support tools
] as const;
const ALIYUN_MODELS = [
  'Aliyun/deepseek-chat', // don't support tools
  'Aliyun/deepseek-reasoner', // don't support tools
] as const;
const DOUBAO_MODELS = [
  'Doubao/deepseek-chat',
  'Doubao/deepseek-reasoner', // support tools!!!
] as const;
const GROK_MODELS = [
  'grok-2-1212', // don't work
] as const;
const OPEN_ROUTER_MODELS = [
  'OpenRouter/qwen/qwq-32b', // don't support tools
  'OpenRouter/openai/gpt-4o-2024-11-20', // function.description has 2014 string limit
  'OpenRouter/openai/o1-mini', // don't support tools
  'OpenRouter/openai/gpt-4-turbo', // function.description has 2014 string limit
  'OpenRouter/openai/gpt-3.5-turbo-0613',
  'OpenRouter/anthropic/claude-3.5-sonnet',
] as const;
const TENCENT_MODELS = [
  'Tencent/deepseek-chat', // don't support tools
  'Tencent/deepseek-reasoner', // don't support tools
] as const;

export type ModelType =
  | (typeof GROQ_MODELS)[number]
  | (typeof DEEPSEEK_MODELS)[number]
  | (typeof GOOGLE_MODELS)[number]
  | (typeof SILICONFLOW_MODELS)[number]
  | (typeof ALIYUN_MODELS)[number]
  | (typeof DOUBAO_MODELS)[number]
  | (typeof GROK_MODELS)[number]
  | (typeof OPEN_ROUTER_MODELS)[number]
  | (typeof TENCENT_MODELS)[number];

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
  } else if (SILICONFLOW_MODELS.includes(model as any)) {
    apiKey = process.env.SILICONFLOW_API_KEY;
    baseURL = process.env.SILICONFLOW_BASE_URL;
  } else if (ALIYUN_MODELS.includes(model as any)) {
    apiKey = process.env.ALIYUN_API_KEY;
    baseURL = process.env.ALIYUN_BASE_URL;
  } else if (DOUBAO_MODELS.includes(model as any)) {
    apiKey = process.env.DOUBAO_API_KEY;
    baseURL = process.env.DOUBAO_BASE_URL;
  } else if (GROK_MODELS.includes(model as any)) {
    apiKey = process.env.GROK_API_KEY;
    baseURL = process.env.GROK_BASE_URL;
  } else if (OPEN_ROUTER_MODELS.includes(model as any)) {
    apiKey = process.env.OPEN_ROUTER_API_KEY;
    baseURL = process.env.OPEN_ROUTER_BASE_URL;
  } else if (TENCENT_MODELS.includes(model as any)) {
    apiKey = process.env.TENCENT_API_KEY;
    baseURL = process.env.TENCENT_BASE_URL;
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }
  assert(apiKey, `apiKey is required for model ${model}`);
  assert(baseURL, `baseURL is required for model ${model}`);
  const openai = createOpenAI({
    apiKey,
    baseURL,
  });
  // @ts-ignore
  return openai(MODELS_ALIAS[model] as ModelType || model);
}
