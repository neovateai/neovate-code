import { Box, Text, useInput } from 'ink';
import pc from 'picocolors';
import React, { useEffect, useState } from 'react';
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

interface NullModel {
  providerId: string;
  modelId: string;
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
  const [nullModels, setNullModels] = useState<NullModel[]>([]);

  useEffect(() => {
    bridge
      .request('models.list', { cwd })
      .then((result) => {
        if (result.data.currentModelInfo) {
          setCurrentModelInfo(result.data.currentModelInfo);
          setCurrentModel(
            `${result.data.currentModelInfo.providerName}/${result.data.currentModelInfo.modelId}`,
          );
        }
        setGroupedModels(result.data.groupedModels);
        setNullModels(result.data.nullModels || []);
      })
      .catch((error) => {
        console.error('models.list failed:', error);
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
      {nullModels.length > 0 && (
        <Box marginBottom={1}>
          <Text color="yellow">
            Warning: Misconfigured models:{' '}
            {nullModels.map((m) => `${m.providerId}/${m.modelId}`).join(', ')}
          </Text>
        </Box>
      )}
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

export function createModelCommand(opts: {
  argvConfig: Record<string, any>;
}): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'model',
    description: 'Select a model',
    async call(onDone) {
      const { argvConfig } = opts;
      if (argvConfig.model) {
        const ModelHintComponent = () => {
          useInput((_input, key) => {
            if (key.return || key.escape) {
              onDone(`Kept model as ${argvConfig.model}`);
            }
          });

          return (
            <Box
              borderStyle="round"
              borderColor="yellow"
              flexDirection="column"
              padding={1}
              width="100%"
            >
              <Box marginBottom={1}>
                <Text bold color="yellow">
                  Model Command Disabled
                </Text>
              </Box>
              <Box>
                <Text color="gray">
                  When -m,--model is supplied, /model won't take effect. Please
                  remove -m,--model and try again.
                </Text>
              </Box>
              <Box marginTop={1}>
                <Text color="gray">Press Enter or Esc to continue...</Text>
              </Box>
            </Box>
          );
        };
        return <ModelHintComponent />;
      }
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
