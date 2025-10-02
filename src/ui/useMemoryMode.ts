import { useCallback } from 'react';
import { useAppStore } from './store';

export function useMemoryMode() {
  const { bridge, cwd, showMemoryModal } = useAppStore();

  const handleMemorySubmit = useCallback(
    async (rule: string) => {
      const result = await showMemoryModal(rule);
      if (result) {
        const isGlobal = result === 'global';
        await bridge.request('project.addMemory', {
          cwd,
          global: isGlobal,
          rule,
        });
      }
    },
    [bridge, cwd, showMemoryModal],
  );

  return {
    handleMemorySubmit,
  };
}
