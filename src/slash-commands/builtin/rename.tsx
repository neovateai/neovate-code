import React from 'react';
import { setTerminalTitle } from '../../utils/setTerminalTitle';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

export function createRenameCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'rename',
    description: 'Rename the current conversation',
    async call(onDone, _context, args) {
      return React.createElement(() => {
        const { bridge, cwd, sessionId } = useAppStore();

        React.useEffect(() => {
          const title = args?.trim();
          if (!title) {
            onDone('Usage: /rename <name>');
            return;
          }
          if (!sessionId) {
            onDone('No active session');
            return;
          }
          bridge
            .request('sessions.rename', { cwd, sessionId, title })
            .then((result) => {
              if (result.success) {
                setTerminalTitle(title);
                onDone(`Session renamed to: ${title}`);
              } else {
                onDone(`Failed to rename: ${result.error}`);
              }
            })
            .catch(() => onDone('Failed to rename session'));
        }, []);

        return null;
      });
    },
  };
}
