import { Box, Text, useInput } from 'ink';
import pc from 'picocolors';
import React, { useEffect, useMemo, useState } from 'react';
import { Context } from '../../context';
import { PluginHookType } from '../../plugin';
import { MODEL_ALIAS } from '../../provider';
import { useAppContext } from '../../ui/AppContext';
import PaginatedSelectInput from '../../ui/components/PaginatedSelectInput';
import { type LocalJSXCommand } from '../types';

interface ModelSelectProps {
  context: Context;
  onExit: (model: string) => void;
  onSelect: (model: string) => void;
}

const DEFAULT_SELECT_ITEMS = Object.entries(MODEL_ALIAS).map(
  ([key, value]) => ({
    label: `${key} → ${pc.gray(`(${value})`)}`,
    value: value,
  }),
);

const ModelSelect: React.FC<ModelSelectProps> = ({
  context,
  onExit,
  onSelect,
}) => {
  const { state, dispatch } = useAppContext();
  const [selectItems, setSelectItems] = useState<
    {
      label: string;
      value: string;
    }[]
  >([]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await context.apply({
          hook: 'modelList',
          args: [],
          memo: DEFAULT_SELECT_ITEMS,
          type: PluginHookType.SeriesLast,
        });
        setSelectItems(models);
      } catch (error) {
        console.warn('Failed to fetch custom models, using defaults:', error);
        setSelectItems(DEFAULT_SELECT_ITEMS);
      }
    };
    fetchModels();
  }, []);

  useInput((_: string, key) => {
    if (key.escape) {
      onExit(state.model);
    }
  });

  const model = useMemo(() => {
    return MODEL_ALIAS[state.model] || state.model;
  }, [state.model]);

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
      <Box>
        <PaginatedSelectInput
          items={selectItems}
          initialIndex={selectItems.findIndex((item) => item.value === model)}
          itemsPerPage={10}
          onSelect={(item) => {
            dispatch({ type: 'SET_MODEL', payload: item.value });
            onSelect(item.value);
          }}
        />
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
