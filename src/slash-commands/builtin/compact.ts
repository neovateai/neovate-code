import createDebug from 'debug';
import React, { useEffect } from 'react';
import { useAppContext } from '../../ui/hooks';
import { generateSummaryMessage } from '../../utils/compact';
import { LocalJSXCommand } from '../types';

const debug = createDebug('takumi:slash-commands:compact');

export const compactCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'compact',
  description: `Clear conversation history but keep a summary in context.`,
  async call(onDone) {
    return React.createElement(() => {
      const { services, state } = useAppContext();
      const isPlan = state.currentMode === 'plan';
      const service = isPlan ? services.planService : services.service;
      if (service.history.length === 0) {
        debug('skipping compacting, history length is 0');
        onDone('No messages to compact');
        return;
      }

      useEffect(() => {
        const run = async () => {
          try {
            await service.compact();
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
