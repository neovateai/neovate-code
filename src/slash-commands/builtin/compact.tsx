import createDebug from 'debug';
import { Box, Text, useInput } from 'ink';
import React, { useEffect, useRef } from 'react';
import { COMPACT_MESSAGE } from '../../compact';
import { GradientText } from '../../ui/GradientText';
import { useAppStore } from '../../ui/store';
import { useTextGradientAnimation } from '../../ui/useTextGradientAnimation';
import type { LocalJSXCommand } from '../types';

const debug = createDebug('neovate:slash-commands:compact');

export const compactCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'compact',
  description: `Clear conversation history but keep a summary in context.`,
  async call(onDone) {
    return React.createElement(() => {
      const { bridge, messages, cwd, sessionId, log } = useAppStore();
      const [loading, setLoading] = React.useState(true);
      const [cancelled, setCancelled] = React.useState(false);
      const cancelledRef = useRef(false);
      const compactingText = 'Compacting...';
      const highlightIndex = useTextGradientAnimation(
        compactingText,
        loading && !cancelled,
      );

      useInput((input, key) => {
        if (
          loading &&
          !cancelled &&
          (key.escape || (key.ctrl && input === 'c'))
        ) {
          setCancelled(true);
          cancelledRef.current = true;
          setLoading(false);
          onDone('Compacting cancelled');
        }
      });

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

            if (cancelledRef.current) {
              return;
            }

            log(`compacted${JSON.stringify(result)}`);
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

            if (cancelledRef.current) {
              return;
            }

            log('added messages');
            setLoading(false);
            onDone(null);
          } catch (error) {
            debug('error compacting', error);
            setLoading(false);
            if (!cancelledRef.current) {
              onDone(
                `Error compacting: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              );
            }
          }
        };
        run();
      }, [bridge.request, cwd, messages, sessionId, log, onDone]);

      if (messages.length === 0) {
        onDone('No messages to compact');
        return;
      }

      if (loading || cancelled) {
        return (
          <Box marginTop={1} flexDirection="row">
            <GradientText
              text={cancelled ? 'Cancelled' : compactingText}
              highlightIndex={cancelled ? -1 : highlightIndex}
            />
            <Text color="gray">{` (Press Esc or Ctrl-C to cancel)`}</Text>
          </Box>
        );
      }

      return null;
    });
  },
};
