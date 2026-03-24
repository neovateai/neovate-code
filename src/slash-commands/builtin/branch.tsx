import React from 'react';
import { setTerminalTitle } from '../../utils/setTerminalTitle';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

export function createBranchCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'branch',
    description: 'Fork the current session into a new branch',
    async call(onDone, _context, args) {
      return React.createElement(() => {
        const { bridge, cwd, sessionId, resumeSession } = useAppStore();

        React.useEffect(() => {
          if (!sessionId) {
            onDone('No active session');
            return;
          }
          bridge
            .request('sessions.fork', {
              cwd,
              sessionId,
              customTitle: args?.trim() || undefined,
            })
            .then(async (result) => {
              if (result.success && result.data) {
                const { sessionId: newId, logFile, title } = result.data;
                await resumeSession(newId, logFile);
                setTerminalTitle(title);
                onDone(null);
              } else {
                onDone(`Failed to branch: ${result.error}`);
              }
            })
            .catch(() => onDone('Failed to branch session'));
        }, []);

        return null;
      });
    },
  };
}
