import type React from 'react';
import { useEffect } from 'react';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

const RewindTrigger: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { showForkModal } = useAppStore();

  useEffect(() => {
    showForkModal();
    onDone();
  }, []);

  return null;
};

export function createRewindCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'rewind',
    description: 'Restore files to a previous checkpoint',
    async call(onDone) {
      return <RewindTrigger onDone={() => onDone(null)} />;
    },
  };
}
