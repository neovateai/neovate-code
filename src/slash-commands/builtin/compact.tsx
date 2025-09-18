import createDebug from 'debug';
import { Box } from 'ink';
import React, { useEffect } from 'react';
import { COMPACT_MESSAGE } from '../../compact';
import { GradientText } from '../../ui/GradientText';
import { useAppStore } from '../../ui/store';
import { useTextGradientAnimation } from '../../ui/useTextGradientAnimation';
import { type LocalJSXCommand } from '../types';

const debug = createDebug('neovate:slash-commands:compact');

export const compactCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'compact',
  description: `Clear conversation history but keep a summary in context.`,
  async call(onDone) {
    return React.createElement(() => {
      const { bridge, messages, cwd, sessionId, log } = useAppStore();
      const [loading, setLoading] = React.useState(true);
      const compactingText = 'Compacting...';
      const highlightIndex = useTextGradientAnimation(compactingText, loading);

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
                  parentUuid: null,
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: result.data.summary,
                    },
                  ],
                  uiContent: COMPACT_MESSAGE,
                },
              ],
            });
            log('added messages');
            setLoading(false);
            onDone(null);
          } catch (error) {
            debug('error compacting', error);
            setLoading(false);
            onDone(
              `Error compacting: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        };
        run();
      }, []);

      if (loading) {
        return (
          <Box marginTop={1}>
            <GradientText
              text={compactingText}
              highlightIndex={highlightIndex}
            />
          </Box>
        );
      }

      return null;
    });
  },
};
