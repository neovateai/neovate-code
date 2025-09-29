import { Box, Text, useInput } from 'ink';
import pc from 'picocolors';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import PaginatedSelectInput from '../../ui/PaginatedSelectInput';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

interface OutputStyleSelectProps {
  onExit: (styleName: string) => void;
  onSelect: (styleName: string) => void;
}

const OutputStyleSelect: React.FC<OutputStyleSelectProps> = ({
  onExit,
  onSelect,
}) => {
  const [currentOutputStyle, setCurrentOutputStyle] = useState<string | null>(
    null,
  );
  const { bridge, cwd } = useAppStore();
  const [selectItems, setSelectItems] = useState<
    {
      label: string;
      value: string;
    }[]
  >([]);

  useEffect(() => {
    bridge.request('getOutputStyles', { cwd }).then((result) => {
      setCurrentOutputStyle(result.data.currentOutputStyle);
      setSelectItems(
        result.data.outputStyles.map((style: any) => ({
          label: `${style.name} → ${pc.gray(`(${style.description})`)}`,
          value: style.name,
        })),
      );
    });
  }, [cwd]);

  const initialIndex = useMemo(() => {
    return selectItems.findIndex((item) => item.value === currentOutputStyle);
  }, [selectItems, currentOutputStyle]);

  useInput((_: string, key) => {
    if (key.escape) {
      onExit(currentOutputStyle || '');
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
            {currentOutputStyle}
          </Text>
        </Text>
      </Box>
      <Box>
        <PaginatedSelectInput
          items={selectItems}
          initialIndex={initialIndex >= 0 ? initialIndex : 0}
          itemsPerPage={10}
          onSelect={(item) => {
            bridge
              .request('setConfig', {
                cwd,
                isGlobal: false,
                key: 'outputStyle',
                value: item.value,
              })
              .then(() => {
                onSelect(item.value);
              });
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
    description: 'Select an output style',
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
