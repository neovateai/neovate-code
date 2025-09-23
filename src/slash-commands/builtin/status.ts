import React from 'react';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

export const statusCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'status',
  description: 'Show status',
  async call(onDone) {
    return React.createElement(() => {
      const { bridge, cwd, sessionId } = useAppStore();
      React.useEffect(() => {
        bridge
          .request('getStatus', {
            cwd,
            sessionId,
          })
          .then((result) => {
            const status = result.data.status;
            const statusStr = Object.entries(status)
              .map(([key, value]: any) => {
                const description = value.description
                  ? ` ${value.description}`
                  : '';
                return `${key}${description}\n${value.items.map((item: any) => `  ${item}`).join('\n')}`;
              })
              .join('\n\n');
            onDone(statusStr);
          });
      }, []);
      return null;
    });
  },
};
