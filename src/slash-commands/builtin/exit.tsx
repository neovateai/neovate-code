import React from 'react';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

export const exitCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'exit',
  description: 'Exit the application',
  async call() {
    return React.createElement(() => {
      const { setStatus } = useAppStore();

      React.useEffect(() => {
        setStatus('exit');
        setTimeout(() => {
          process.exit(0);
        }, 100);
      }, []);

      return null;
    });
  },
};
