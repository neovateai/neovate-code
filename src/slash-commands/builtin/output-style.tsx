import { Box, Text, useInput } from 'ink';
import pc from 'picocolors';
import React, { useEffect, useMemo, useState } from 'react';
import { ConfigManager } from '../../config';
import { PRODUCT_NAME } from '../../constants';
import { useAppContext } from '../../ui/AppContext';
import PaginatedSelectInput from '../../ui/components/PaginatedSelectInput';
import { type LocalJSXCommand } from '../types';

interface OutputStyleSelectProps {
  onExit: (styleName: string) => void;
  onSelect: (styleName: string) => void;
}

let updatedOutputStyle: string | null = null;

const OutputStyleSelect: React.FC<OutputStyleSelectProps> = ({
  onExit,
  onSelect,
}) => {
  const { services } = useAppContext();
  const context = services.context;
  const [selectItems, setSelectItems] = useState<
    {
      label: string;
      value: string;
    }[]
  >([]);

  const currentOutputStyle = useMemo(() => {
    return context.outputStyleManager.getOutputStyle(
      updatedOutputStyle || services.context.config.outputStyle || 'Default',
    );
  }, [context]);

  useEffect(() => {
    const allOutputStyles = context.outputStyleManager.getAllOutputStyles();
    const items = allOutputStyles.map((style) => ({
      label: `${style.name} → ${pc.gray(`(${style.description})`)}`,
      value: style.name,
    }));
    setSelectItems(items);
  }, [context]);

  const initialIndex = useMemo(() => {
    return selectItems.findIndex(
      (item) => item.value === currentOutputStyle.name,
    );
  }, [selectItems, currentOutputStyle.name]);

  useInput((_: string, key) => {
    if (key.escape) {
      onExit(currentOutputStyle.name);
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Box marginBottom={1}>
        <Text bold>Select Output Style</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">
          current output style:{' '}
          <Text bold color="cyan">
            {currentOutputStyle.name}
          </Text>
        </Text>
      </Box>
      <Box>
        <PaginatedSelectInput
          items={selectItems}
          initialIndex={initialIndex >= 0 ? initialIndex : 0}
          itemsPerPage={10}
          onSelect={(item) => {
            updatedOutputStyle = item.value;
            const configManager = new ConfigManager(
              context.cwd,
              PRODUCT_NAME,
              {},
            );
            configManager.setConfig(false, 'outputStyle', item.value);
            services.context.config.outputStyle = item.value;
            services.service.setupAgent();
            onSelect(item.value);
          }}
        />
      </Box>
    </Box>
  );
};

export function createOutputStyleCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'output-style',
    description: 'Switch or display current output style',
    async call(onDone) {
      const OutputStyleComponent = () => {
        return (
          <OutputStyleSelect
            onExit={(styleName) => {
              onDone(`Kept output style as ${styleName}`);
            }}
            onSelect={(styleName) => {
              onDone(`Output style changed to ${styleName}`);
            }}
          />
        );
      };
      return <OutputStyleComponent />;
    },
  };
}
