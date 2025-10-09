import { useCallback } from 'react';
import { useAppStore } from './store';

export function useMemoryMode() {
  const { bridge, cwd, showMemoryModal, addMessage } = useAppStore();

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
        addMessage({
          role: 'user',
          content: [
            { type: 'text', text: `Added to ${result} memory: ${rule}` },
          ],
        });
      }
    },
    [bridge, cwd, addMessage, showMemoryModal],
  );

  return {
    handleMemorySubmit,
  };
}
