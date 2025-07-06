import { execFileSync } from 'child_process';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import React from 'react';
import { useAppContext } from '../../ui/AppContext';
import { LocalJSXCommand } from '../types';

interface EditorDisplay {
  name: string;
  command: string;
  disabled?: boolean;
}

// 检查编辑器是否已安装
function isEditorAvailable(command: string): boolean {
  try {
    if (command === 'no_set') return true;
    execFileSync('which', [command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const AVAILABLE_EDITORS: EditorDisplay[] = [
  {
    name: 'VS Code',
    command: 'code',
  },
  {
    name: 'Cursor',
    command: 'cursor',
  },
  {
    name: 'Vim',
    command: 'vim',
  },
  {
    name: 'Zed',
    command: 'zed',
  },
  {
    name: 'Windsurf',
    command: 'windsurf',
  },
  {
    name: 'None (disabled)',
    command: 'no_set',
  },
];

interface EditorSettingsDialogProps {
  onExit: () => void;
  onSelect: (command: string | undefined) => void;
}

const EditorSettingsDialog: React.FC<EditorSettingsDialogProps> = ({
  onExit,
  onSelect,
}) => {
  const [focusedSection, setFocusedSection] = React.useState('editor');
  const { state, dispatch } = useAppContext();

  useInput((_: string, key) => {
    if (key.escape) {
      onExit();
    }
  });

  const items = AVAILABLE_EDITORS.map((item) => {
    const isInstalled = isEditorAvailable(item.command);
    return {
      label: `${item.name}${!isInstalled ? ' (Not installed)' : ''}`,
      value: item.command,
      disabled: item.disabled || !isInstalled,
    };
  });

  const handleSelect = (item: { value: string }) => {
    if (item.value === 'no_set') {
      onSelect(undefined);
      return;
    }
    dispatch({ type: 'SET_EXTERNAL_EDITOR', payload: item.value });
    onSelect(item.value);
  };

  let currentEditorName = 'None';
  let isCurrentEditorInstalled = false;
  if (state.externalEditor) {
    const editor = AVAILABLE_EDITORS.find(
      (e) => e.command === state.externalEditor,
    );
    currentEditorName = editor
      ? editor.name
      : `Custom (${state.externalEditor})`;
    isCurrentEditorInstalled = isEditorAvailable(state.externalEditor);
  }

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      flexDirection="row"
      padding={1}
      width="100%"
    >
      <Box flexDirection="column" width="45%" paddingRight={2}>
        <Text bold={focusedSection === 'editor'}>
          {`${focusedSection === 'editor' ? '> ' : '  '}Select Editor`}
        </Text>
        <SelectInput
          items={items}
          initialIndex={
            state.externalEditor
              ? items.findIndex((item) => item.value === state.externalEditor)
              : 0
          }
          onSelect={handleSelect}
          isFocused={focusedSection === 'editor'}
        />
        <Box marginTop={1}>
          <Text color="gray">(Use Enter to select, ESC to cancel)</Text>
        </Box>
      </Box>
      <Box flexDirection="column" width="55%" paddingLeft={2}>
        <Text bold>Editor Preference</Text>
        <Box flexDirection="column" gap={1} marginTop={1}>
          <Text color="gray">
            These editors are currently supported. Please ensure the selected
            editor is installed and available in your PATH.
          </Text>
          <Text color="gray">
            Your current editor is:{' '}
            <Text
              color={
                currentEditorName === 'None' || !isCurrentEditorInstalled
                  ? 'red'
                  : 'cyan'
              }
              bold
            >
              {currentEditorName}
              {!isCurrentEditorInstalled && currentEditorName !== 'None'
                ? ' (Not installed)'
                : ''}
            </Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export const editorCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'editor',
  description: 'Configure external editor settings',
  async call(onDone) {
    const EditorComponent = () => {
      return (
        <EditorSettingsDialog
          onExit={() => {
            onDone('Editor settings cancelled');
          }}
          onSelect={(command) => {
            if (command) {
              onDone(`Editor settings saved: ${command}`);
            } else {
              onDone('Editor settings cancelled');
            }
          }}
        />
      );
    };

    return <EditorComponent />;
  },
};
