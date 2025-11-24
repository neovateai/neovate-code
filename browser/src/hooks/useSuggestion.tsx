import { AppstoreOutlined, FileSearchOutlined } from '@ant-design/icons';
import { debounce } from 'lodash-es';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import DevFileIcon from '@/components/DevFileIcon';
import type { SuggestionItem } from '@/components/SuggestionList';
import { ContextType } from '@/constants/context';
import { state as chatState } from '@/state/chat';
import * as context from '@/state/context';
import { actions, state } from '@/state/suggestion';
import { CommandSource } from '@/types/chat';
import { storeValueToContextItem } from '@/utils/context';

const SUGGESTION_SEARCH_DEBOUNCE_TIME = 200;

export const useSuggestion = (showSlashCommand: boolean = true) => {
  const { fileList, slashCommandList, loading } = useSnapshot(state);
  const { contexts } = useSnapshot(context.state);

  const { t } = useTranslation();

  useEffect(() => {
    if (chatState.initialized) {
      actions.getSlashCommandList();
      actions.getFileList('');
    }
  }, [chatState.initialized]);

  const fileSuggestions = useMemo(() => {
    return fileList.map((file) => {
      const label = file.name;
      const extra = file.path.split('/').slice(0, -1).join('/');
      const disabled = contexts.files.some(
        (selectedFile) => selectedFile.path === file.path,
      );

      return {
        label,
        value: file.path,
        icon: (
          <DevFileIcon
            isFolder={file.type === 'directory'}
            fileExt={file.path.split('.').pop() ?? ''}
          />
        ),
        disabled,
        extra,
        contextItem: storeValueToContextItem(file, ContextType.FILE),
      } as SuggestionItem;
    });
  }, [fileList, contexts]);

  const slashCommandSuggestions = useMemo(() => {
    return slashCommandList.map((cmd) => {
      const label = `/${cmd.command.name}`;
      const prefix = (() => {
        switch (cmd.source) {
          case CommandSource.User:
            return t('suggestion.slashCommandPrefix.global');
          case CommandSource.Project:
            return t('suggestion.slashCommandPrefix.project');
          default:
            return '';
        }
      })();
      // only allow one slash command
      const disabled = contexts.slashCommands.length > 0;

      return {
        label,
        value: cmd.command.name,
        icon: <AppstoreOutlined />,
        extra: `${cmd.command.description} ${prefix ? `(${prefix})` : ''}`,
        disabled,
        contextItem: storeValueToContextItem(
          cmd.command,
          ContextType.SLASH_COMMAND,
        ),
      };
    }) as SuggestionItem[];
  }, [slashCommandList, t, contexts]);

  const defaultSuggestions = useMemo(() => {
    const suggestions: SuggestionItem[] = [
      {
        label: t('context.filesAndFolders'),
        value: ContextType.FILE,
        icon: <FileSearchOutlined />,
        children: fileSuggestions,
      },
    ];

    if (showSlashCommand) {
      suggestions.push({
        label: t('context.slashCommands'),
        value: ContextType.SLASH_COMMAND,
        icon: <AppstoreOutlined />,
        children: slashCommandSuggestions,
        disabled: contexts.slashCommands.length > 0,
      });
    }

    return suggestions;
  }, [fileSuggestions, slashCommandSuggestions, t, contexts, showSlashCommand]);

  const searchFunctionMap: { [key in ContextType]?: (text: string) => void } = {
    [ContextType.FILE]: (text) => actions.getFileList(text),
    [ContextType.SLASH_COMMAND]: (text) =>
      actions.getSlashCommandList({
        searchString: text,
      }),
  };

  const handleSearch = debounce((type: ContextType, text: string) => {
    const targetFunction = searchFunctionMap[type];

    targetFunction?.(text);
  }, SUGGESTION_SEARCH_DEBOUNCE_TIME);

  return {
    defaultSuggestions,
    handleSearch,
    loading,
  };
};
