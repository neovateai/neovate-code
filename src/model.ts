import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import assert from 'assert';
import { createOllama } from 'ollama-ai-provider';

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
| Gemini | gemma-3-27b-it | ❌ |
| OpenRouter | qwen/qwq-32b | ❌ |
| OpenRouter | openai/gpt-4o-2024-11-20 | ✅ |
| OpenRouter | openai/o1-mini | ❌ |
| OpenRouter | openai/gpt-4-turbo | ✅ |
| OpenRouter | anthropic/claude-3.5-sonnet | ✅ |
| Ollama | qwq:32b | ❌ |
| Inference | * | ❌ |
*/

const GROQ_MODELS = [
  'Groq/qwen-qwq-32b',
  'Groq/deepseek-r1-distill-qwen-32b',
  'Groq/deepseek-r1-distill-llama-70b',
] as const;
const DEEPSEEK_MODELS = [
  'DeepSeek/deepseek-chat',
  'DeepSeek/deepseek-reasoner', // don't support tools
] as const;
const GOOGLE_MODELS = [
  'Google/gemini-2.0-flash-001',
  'Google/gemini-2.0-flash-thinking-exp-01-21', // don't support tools
  'Google/gemini-2.0-pro-exp-02-05',
  'Google/gemini-2.5-pro-exp-03-25',
  'Google/gemma-3-27b-it', // don't support tools
] as const;
const SILICONFLOW_MODELS = [
  'SiliconFlow/DeepSeek-V3',
  'SiliconFlow/DeepSeek-R1', // don't support tools
] as const;
const ALIYUN_MODELS = [
  'Aliyun/deepseek-v3', // don't support tools
  'Aliyun/deepseek-r1', // don't support tools
  'Aliyun/qwq-32b', // stream only (don't work)
  'Aliyun/qwq-plus', // stream only (don't work)
] as const;
const DOUBAO_MODELS = [
  // DeepSeek-Chat
  'Doubao/ep-20250210151255-r5x5s',
  // DeepSeek-Reasoner
  'Doubao/ep-20250210151757-wvgcj',
] as const;
const GROK_MODELS = [
  'Grok/grok-3-beta',
  'Grok/grok-3-fast-beta',
  'Grok/grok-3-mini-beta',
  'Grok/grok-3-mini-fast-beta',
] as const;
const OPEN_ROUTER_MODELS = [
  'OpenRouter/qwen/qwq-32b', // don't support tools
  'OpenRouter/openai/o1-mini', // don't support tools
  'OpenRouter/openai/gpt-4-turbo', // function.description has 2014 string limit
  'OpenRouter/openai/gpt-3.5-turbo-0613',
  'OpenRouter/openai/gpt-4.5-preview',
  'OpenRouter/openai/o3-mini-high',
  'OpenRouter/openai/o3-mini',
  'OpenRouter/openai/o1',
  'OpenRouter/openai/gpt-4-32k',
  'OpenRouter/openai/gpt-4o', // function.description has 2014 string limit
  'OpenRouter/openai/gpt-4o-mini',
  'OpenRouter/openai/o1-preview',
  'OpenRouter/anthropic/claude-3.5-sonnet',
  'OpenRouter/anthropic/claude-3.7-sonnet',
  'OpenRouter/anthropic/claude-3.7-sonnet-thought',
  'OpenRouter/mistralai/mistral-small-3.1-24b-instruct',
  'OpenRouter/deepseek/deepseek-chat-v3-0324',
  'OpenRouter/openrouter/quasar-alpha',
] as const;
const TENCENT_MODELS = [
  'Tencent/deepseek-v3', // don't support tools
  'Tencent/deepseek-r1', // don't support tools
] as const;
const OLLAMA_MODELS = ['Ollama/qwq:32b'] as const;
const VSCODE_MODELS = [
  'Vscode/gpt-4o',
  'Vscode/claude-3.5-sonnet',
  'Vscode/claude-3.7-sonnet',
  'Vscode/claude-3.7-sonnet-thought',
  'Vscode/gpt-3.5-turbo',
  'Vscode/gemini-2.0-flash',
  'Vscode/o3-mini',
  'Vscode/o1-ga',
] as const;
const INFERENCE_MODELS = [
  'Inference/deepseek/deepseek-r1/fp-8',
  'Inference/deepseek/deepseek-v3/fp-8',
  'Inference/deepseek/deepseek-v3-0324/fp-8',
  'Inference/google/gemma-3-27b-instruct/bf-16',
  'Inference/qwen/qwen2.5-7b-instruct/bf-16',
] as const;
const OPENAI_MODELS = [
  'OpenAI/gpt-4.5-preview',
  'OpenAI/o3-mini-high',
  'OpenAI/o3-mini',
  'OpenAI/o1',
  'OpenAI/gpt-4-32k',
  'OpenAI/gpt-4-turbo',
  'OpenAI/gpt-4o',
  'OpenAI/gpt-4o-mini',
  'OpenAI/o1-preview',
  'OpenAI/o1-mini',
  'OpenAI/gpt-3.5-turbo-0613',
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
  | (typeof TENCENT_MODELS)[number]
  | (typeof OLLAMA_MODELS)[number]
  | (typeof VSCODE_MODELS)[number]
  | (typeof INFERENCE_MODELS)[number]
  | (typeof OPENAI_MODELS)[number];

export function getModel(model: ModelType) {
  let apiKey;
  let baseURL;

  if (OLLAMA_MODELS.includes(model as any)) {
    const ollama = createOllama({
      baseURL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/api',
    });
    return ollama(stripProviderPrefix(model));
  }

  if (GOOGLE_MODELS.includes(model as any)) {
    apiKey = process.env.GOOGLE_API_KEY;
    baseURL = 'https://generativelanguage.googleapis.com/v1beta/';
  } else if (DEEPSEEK_MODELS.includes(model as any)) {
    apiKey = process.env.DEEPSEEK_API_KEY;
    baseURL = 'https://api.deepseek.com/v1';
  } else if (GROQ_MODELS.includes(model as any)) {
    apiKey = process.env.GROQ_API_KEY;
    baseURL = 'https://api.groq.com/openai/v1';
  } else if (SILICONFLOW_MODELS.includes(model as any)) {
    apiKey = process.env.SILICONFLOW_API_KEY;
    baseURL = 'https://api.siliconflow.com/v1';
  } else if (ALIYUN_MODELS.includes(model as any)) {
    apiKey = process.env.ALIYUN_API_KEY;
    baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  } else if (DOUBAO_MODELS.includes(model as any)) {
    apiKey = process.env.DOUBAO_API_KEY;
    baseURL = 'https://ark.cn-beijing.volces.com/api/v3';
  } else if (GROK_MODELS.includes(model as any)) {
    apiKey = process.env.GROK_API_KEY;
    const xai = createXai({
      apiKey,
    });
    return xai(stripProviderPrefix(model));
  } else if (OPEN_ROUTER_MODELS.includes(model as any)) {
    apiKey = process.env.OPEN_ROUTER_API_KEY;
    baseURL = 'https://openrouter.ai/api/v1';
  } else if (TENCENT_MODELS.includes(model as any)) {
    apiKey = process.env.TENCENT_API_KEY;
    baseURL = 'https://api.lkeap.cloud.tencent.com/v1';
  } else if (VSCODE_MODELS.includes(model as any)) {
    apiKey = 'none';
    baseURL = process.env.VSCODE_BASE_URL;
  } else if (INFERENCE_MODELS.includes(model as any)) {
    apiKey = process.env.INFERENCE_API_KEY;
    baseURL = 'https://api.inference.net/v1';
  } else if (OPENAI_MODELS.includes(model as any)) {
    apiKey = process.env.OPENAI_API_KEY;
    baseURL = 'https://api.openai.com/v1';
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }

  assert(apiKey, `apiKey is required for model ${model}`);
  assert(baseURL, `baseURL is required for model ${model}`);
  const openai = createOpenAI({
    apiKey,
    baseURL,
  });
  return openai(stripProviderPrefix(model));
}

// e.g.
// 'OpenRouter/openai/gpt-4o-2024-11-20' -> 'openai/gpt-4o-2024-11-20'
// 'foo/bar' -> 'bar'
function stripProviderPrefix(model: ModelType) {
  if (model.includes('/')) {
    return model.split('/').slice(1).join('/');
  } else {
    return model;
  }
}
