import { AppstoreOutlined, FileSearchOutlined } from '@ant-design/icons';
import { debounce } from 'lodash-es';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import DevFileIcon from '@/components/DevFileIcon';
import type { SuggestionItem } from '@/components/SuggestionList';
import { CONTEXT_MAX_POPUP_ITEM_COUNT, ContextType } from '@/constants/context';
import { state as clientState } from '@/state/client';
import * as context from '@/state/context';
import { actions, state } from '@/state/suggestion';
import { CommandSource } from '@/types/chat';
import { storeValueToContextItem } from '@/utils/context';

const SUGGESTION_SEARCH_DEBOUNCE_TIME = 200;

export const useSuggestion = () => {
  const { fileList, slashCommandList, loading } = useSnapshot(state);
  const clientSnap = useSnapshot(clientState);
  const { contexts } = useSnapshot(context.state);

  const { t } = useTranslation();

  useEffect(() => {
    actions.getFileList({ maxSize: CONTEXT_MAX_POPUP_ITEM_COUNT });
  }, []);

  useEffect(() => {
    if (clientSnap.state === 'connected') {
      actions.getSlashCommandList();
    }
  }, [clientSnap.state]);

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
    });
  }, [slashCommandList, t, contexts]);

  const defaultSuggestions = useMemo(() => {
    return [
      {
        label: t('context.filesAndFolders'),
        value: ContextType.FILE,
        icon: <FileSearchOutlined />,
        children: fileSuggestions,
      },
      {
        label: t('context.slashCommands'),
        value: ContextType.SLASH_COMMAND,
        icon: <AppstoreOutlined />,
        children: slashCommandSuggestions,
        // only allow one slash command
        disabled: contexts.slashCommands.length > 0,
      },
    ] as SuggestionItem[];
  }, [fileSuggestions, slashCommandSuggestions, t, contexts]);

  const searchFunctionMap: { [key in ContextType]?: (text: string) => void } = {
    [ContextType.FILE]: (text) =>
      actions.getFileList({
        maxSize: CONTEXT_MAX_POPUP_ITEM_COUNT,
        searchString: text,
      }),
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
