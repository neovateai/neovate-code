import { useEffect, useState } from 'react';
import { getAvailableModels, setCurrentModel } from '@/api/model';
import { actions } from '@/state/model';
import type { Model } from '@/types/model';

export function useModels() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 加载模型列表
  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const models = await getAvailableModels();
      actions.setModels(models);

      // 如果没有当前模型，设置第一个为默认
      if (models.length > 0) {
        await selectModel(models[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load models'));
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  // 选择模型
  const selectModel = async (model: Model) => {
    try {
      setLoading(true);
      setError(null);
      const result = await setCurrentModel(model.name);
      if (result.success) {
        actions.setCurrentModel(model);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to select model'),
      );
      console.error('Failed to select model:', err);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载模型列表
  useEffect(() => {
    loadModels();
  }, []);

  return {
    loading,
    error,
    loadModels,
    selectModel,
  };
}
