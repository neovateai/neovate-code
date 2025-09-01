import { AppstoreOutlined, FileSearchOutlined } from '@ant-design/icons';
import { debounce } from 'lodash-es';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import DevFileIcon from '@/components/DevFileIcon';
import type { SuggestionItem } from '@/components/SuggestionList';
import { CONTEXT_MAX_POPUP_ITEM_COUNT, ContextType } from '@/constants/context';
import { actions, state } from '@/state/suggestion';
import { storeValueToContextItem } from '@/utils/context';

export const useSuggestion = () => {
  const { fileList, slashCommandList, loading } = useSnapshot(state);

  const { t } = useTranslation();

  useEffect(() => {
    (async () => {
      await actions.getFileList({ maxSize: CONTEXT_MAX_POPUP_ITEM_COUNT });
      await actions.getSlashCommandList();
    })();
  }, []);

  const fileSuggestions = useMemo(() => {
    return fileList.map((file) => {
      const label = file.name;
      const extra = file.path.split('/').slice(0, -1).join('/');

      return {
        label,
        value: file.path,
        icon: (
          <DevFileIcon
            isFolder={file.type === 'directory'}
            fileExt={file.path.split('.').pop() ?? ''}
          />
        ),
        extra,
        contextItem: storeValueToContextItem(file, ContextType.FILE),
      } as SuggestionItem;
    });
  }, [fileList]);

  const slashCommandSuggestions = useMemo(() => {
    return slashCommandList.map((cmd) => {
      const label = `${cmd.type === 'global' ? t('suggestion.slashCommandPrefix.global') : t('suggestion.slashCommandPrefix.project')}:/${cmd.name}`;
      const extra = cmd.description;

      return {
        label,
        value: cmd.path,
        icon: <AppstoreOutlined />,
        extra,
        contextItem: storeValueToContextItem(cmd, ContextType.SLASH_COMMAND),
      };
    });
  }, [slashCommandList, t]);

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
      },
    ] as SuggestionItem[];
  }, [fileSuggestions, slashCommandSuggestions, t]);

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
  }, 500);

  return {
    defaultSuggestions,
    handleSearch,
    loading,
  };
};
