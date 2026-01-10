import React from 'react';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

export const exportCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'export',
  description: 'Export current session to markdown',
  async call(onDone) {
    return React.createElement(() => {
      const { bridge, cwd, sessionId } = useAppStore();

      React.useEffect(() => {
        bridge
          .request('session.export', { cwd, sessionId })
          .then((res) => {
            if (res.success) {
              onDone(`Exported to ${res.data.filePath}`);
            } else {
              onDone(`Export failed: ${res.error}`);
            }
          })
          .catch((e) => {
            if (e instanceof Error) {
              onDone(`Export failed: ${e.message}`);
            } else {
              onDone(`Export failed: ${String(e)}`);
            }
          });
      }, [bridge, cwd, sessionId, onDone]);

      return null;
    });
  },
};
