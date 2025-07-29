import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import pc from 'picocolors';
import React, { useMemo } from 'react';
import { Context } from '../../context';
import { MODEL_ALIAS } from '../../provider';
import { LocalJSXCommand } from '../types';

interface ModelSelectProps {
  context: Context;
  onExit: () => void;
  onSelect: (model: string) => void;
}

const selectItems = Object.entries(MODEL_ALIAS).map(([key, value]) => ({
  label: `${key} → ${pc.gray(`(${value})`)}`,
  value: value,
}));

const ModelSelect: React.FC<ModelSelectProps> = ({
  context,
  onExit,
  onSelect,
}) => {
  useInput((_: string, key) => {
    if (key.escape) {
      onExit();
    }
  });

  const model = useMemo(() => {
    return MODEL_ALIAS[context.config.model] || context.config.model;
  }, [context.config.model]);

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Box marginBottom={1}>
        <Text bold>Select Model</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">
          current model:{' '}
          <Text bold color="cyan">
            {model}
          </Text>
        </Text>
      </Box>
      <Box marginBottom={1}>
        <SelectInput
          items={selectItems}
          initialIndex={selectItems.findIndex((item) => item.value === model)}
          onSelect={(item) => {
            console.log(item);
            context.config.model = item.value;
            onSelect(item.value);
          }}
        />
      </Box>
      <Box>
        <Text color="gray" dimColor>
          (Use Enter to select, ESC to cancel)
        </Text>
      </Box>
    </Box>
  );
};

export function createModelCommand(opts: {
  context: Context;
}): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'model',
    description: 'Switch or display current model',
    async call(onDone) {
      const ModelComponent = () => {
        return (
          <ModelSelect
            context={opts.context}
            onExit={() => {
              onDone('Model selected cancelled');
            }}
            onSelect={(model) => {
              onDone(`Model selected: ${model}`);
            }}
          />
        );
      };
      return <ModelComponent />;
    },
  };
}
