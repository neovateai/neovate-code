import React from 'react';
import { Context } from '../../context';
import { LocalJSXCommand } from '../types';
export function createModelCommand(opts: {
  context: Context;
}): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'model',
    description: 'Switch or display current model',
    async call(onDone) {
      const ModelSelect = React.lazy(
        () => import('../../ui/components/ModelSelect'),
      );

      const ModelComponent = () => {
        return (
          <ModelSelect
            context={opts.context}
            onExit={(model) => {
              onDone(`Kept model as ${model}`);
            }}
            onSelect={(model) => {
              onDone(`Model changed to ${model}`);
            }}
          />
        );
      };
      return <ModelComponent />;
    },
  };
}
