import createDebug from 'debug';
import React, { useEffect } from 'react';
import { useAppStore } from '../../ui/store';
import { type LocalJSXCommand } from '../types';

const debug = createDebug('neovate:slash-commands:compact');

export const compactCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'compact',
  description: `Clear conversation history but keep a summary in context.`,
  async call(onDone) {
    return React.createElement(() => {
      const { bridge, messages, cwd, sessionId, log } = useAppStore();
      if (messages.length === 0) {
        onDone('No messages to compact');
        return;
      }
      useEffect(() => {
        log('use effect...');
        const run = async () => {
          try {
            log('compacting...');
            const result = await bridge.request('compact', {
              cwd,
              messages,
              sessionId,
            });
            log('compacted' + JSON.stringify(result));
            await bridge.request('addMessages', {
              cwd,
              sessionId,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: result.data.summary,
                    },
                  ],
                  parentUuid: null,
                },
              ],
            });
            log('added messages');
            onDone('Chat history compressed successfully');
          } catch (error) {
            debug('error compacting', error);
            onDone(
              `Error compacting: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        };
        run();
      }, []);
      return null;
    });
  },
};
