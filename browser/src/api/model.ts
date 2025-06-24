import type { Model } from '@/types/model';
import { MOCK_MODELS } from '@/types/model';

export interface FileItem {
  path: string;
  type: 'file' | 'directory';
  name: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export interface AppData {
  productName: string;
  version: string;
  cwd: string;
  config: Record<string, any>;
}

// 获取所有可用的模型
export async function getAvailableModels(): Promise<Model[]> {
  // 在实际项目中，这里应该调用真实的API
  // 目前使用mock数据
  return Promise.resolve(MOCK_MODELS);
}

// 设置当前使用的模型
export async function setCurrentModel(
  modelName: string,
): Promise<{ success: boolean }> {
  // 在实际项目中，这里应该调用真实的API
  console.log(`Setting current model to: ${modelName}`);
  return Promise.resolve({ success: true });
}
