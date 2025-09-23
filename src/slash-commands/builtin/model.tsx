import { Box, Text } from 'ink';
import pc from 'picocolors';
import type React from 'react';
import { useEffect, useState } from 'react';
import PaginatedGroupSelectInput from '../../ui/PaginatedGroupSelectInput';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

interface ModelSelectProps {
  onExit: (model: string) => void;
  onSelect: (model: string) => void;
}

interface GroupedData {
  provider: string;
  providerId: string;
  models: { name: string; modelId: string; value: string }[];
}

export const ModelSelect: React.FC<ModelSelectProps> = ({
  onExit,
  onSelect,
}) => {
  const { bridge, cwd, setModel } = useAppStore();
  const [currentModel, setCurrentModel] = useState<string>('');
  const [currentModelInfo, setCurrentModelInfo] = useState<{
    providerName: string;
    modelName: string;
    modelId: string;
  } | null>(null);
  const [groupedModels, setGroupedModels] = useState<GroupedData[]>([]);

  useEffect(() => {
    bridge.request('getModels', { cwd }).then((result) => {
      if (result.data.currentModel) {
        setCurrentModel(result.data.currentModel);
        setCurrentModelInfo(result.data.currentModelInfo);
      }
      setGroupedModels(result.data.groupedModels);
    });
  }, [cwd]);

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
            {currentModelInfo
              ? `${currentModelInfo.providerName}/${currentModelInfo.modelName} ${pc.gray(`(${currentModelInfo.modelId})`)}`
              : currentModel}
          </Text>
        </Text>
      </Box>
      <Box>
        <PaginatedGroupSelectInput
          groups={groupedModels}
          initialValue={currentModel}
          itemsPerPage={15}
          enableSearch={true}
          onCancel={() => onExit(currentModel)}
          onSelect={(item) => {
            setModel(item.value);
            onSelect(item.value);
          }}
        />
      </Box>
    </Box>
  );
};

export function createModelCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'model',
    description: 'Select a model',
    async call(onDone) {
      const ModelComponent = () => {
        return (
          <ModelSelect
            onExit={(model) => {
              onDone(`Kept model as ${model}`);
            }}
            onSelect={(model) => {
              onDone(`Model changed to ${model} globally`);
            }}
          />
        );
      };
      return <ModelComponent />;
    },
  };
}
