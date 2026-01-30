// Provider types
export {
  ApiFormat,
  type Provider,
  type ProvidersMap,
  type Model,
  type ModelModalities,
  type ProviderModel,
} from './types';

// Utility functions
export {
  withProxyConfig,
  getProviderBaseURL,
  getProviderApiKey,
  openaiModelCreator,
  createModelCreator,
} from './utils';

// Individual providers
export { githubCopilotProvider } from './github-copilot';
export { openaiProvider } from './openai';
export { googleProvider } from './google';
export { deepseekProvider } from './deepseek';
export { xaiProvider } from './xai';
export { anthropicProvider } from './anthropic';
export { aihubmixProvider } from './aihubmix';
export { openrouterProvider } from './openrouter';
export { iflowProvider } from './iflow';
export { moonshotaiProvider } from './moonshotai';
export { moonshotaiCnProvider } from './moonshotai-cn';
export { groqProvider } from './groq';
export { siliconflowProvider } from './siliconflow';
export { siliconflowCnProvider } from './siliconflow-cn';
export { modelscopeProvider } from './modelscope';
export { volcengineProvider } from './volcengine';
export { zaiCodingPlanProvider } from './zai-coding-plan';
export { zhipuaiCodingPlanProvider } from './zhipuai-coding-plan';
export { zhipuaiProvider } from './zhipuai';
export { zenmuxProvider } from './zenmux';
export { minimaxProvider } from './minimax';
export { minimaxCnProvider } from './minimax-cn';
export { xiaomiProvider } from './xiaomi';
export { cerebrasProvider } from './cerebras';
export { huggingfaceProvider } from './huggingface';
export { poeProvider } from './poe';
export { antigravityProvider } from './antigravity';
export { nvidiaProvider } from './nvidia';
export { canopywaveProvider } from './canopywave';
export { modelwatchProvider } from './modelwatch';

import type { ProvidersMap } from './types';
import { githubCopilotProvider } from './github-copilot';
import { openaiProvider } from './openai';
import { googleProvider } from './google';
import { deepseekProvider } from './deepseek';
import { xaiProvider } from './xai';
import { anthropicProvider } from './anthropic';
import { aihubmixProvider } from './aihubmix';
import { openrouterProvider } from './openrouter';
import { iflowProvider } from './iflow';
import { moonshotaiProvider } from './moonshotai';
import { moonshotaiCnProvider } from './moonshotai-cn';
import { groqProvider } from './groq';
import { siliconflowProvider } from './siliconflow';
import { siliconflowCnProvider } from './siliconflow-cn';
import { modelscopeProvider } from './modelscope';
import { volcengineProvider } from './volcengine';
import { zaiCodingPlanProvider } from './zai-coding-plan';
import { zhipuaiCodingPlanProvider } from './zhipuai-coding-plan';
import { zhipuaiProvider } from './zhipuai';
import { zenmuxProvider } from './zenmux';
import { minimaxProvider } from './minimax';
import { minimaxCnProvider } from './minimax-cn';
import { xiaomiProvider } from './xiaomi';
import { cerebrasProvider } from './cerebras';
import { huggingfaceProvider } from './huggingface';
import { poeProvider } from './poe';
import { antigravityProvider } from './antigravity';
import { nvidiaProvider } from './nvidia';
import { canopywaveProvider } from './canopywave';
import { modelwatchProvider } from './modelwatch';

// Combined providers map
export const providers: ProvidersMap = {
  'github-copilot': githubCopilotProvider,
  openai: openaiProvider,
  google: googleProvider,
  deepseek: deepseekProvider,
  xai: xaiProvider,
  anthropic: anthropicProvider,
  aihubmix: aihubmixProvider,
  openrouter: openrouterProvider,
  iflow: iflowProvider,
  moonshotai: moonshotaiProvider,
  'moonshotai-cn': moonshotaiCnProvider,
  groq: groqProvider,
  siliconflow: siliconflowProvider,
  'siliconflow-cn': siliconflowCnProvider,
  modelscope: modelscopeProvider,
  volcengine: volcengineProvider,
  'zai-coding-plan': zaiCodingPlanProvider,
  'zhipuai-coding-plan': zhipuaiCodingPlanProvider,
  zhipuai: zhipuaiProvider,
  zenmux: zenmuxProvider,
  minimax: minimaxProvider,
  'minimax-cn': minimaxCnProvider,
  xiaomi: xiaomiProvider,
  cerebras: cerebrasProvider,
  huggingface: huggingfaceProvider,
  poe: poeProvider,
  antigravity: antigravityProvider,
  nvidia: nvidiaProvider,
  canopywave: canopywaveProvider,
  modelwatch: modelwatchProvider,
};
