import {
  ArrowRightOutlined,
  FileSearchOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { debounce } from 'lodash-es';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import DevFileIcon from '@/components/DevFileIcon';
import type { SuggestionItem } from '@/components/SuggestionList';
import {
  AI_CONTEXT_NODE_CONFIGS,
  CONTEXT_MAX_POPUP_ITEM_COUNT,
  ContextType,
} from '@/constants/context';
import {
  actions as slashCommandActions,
  state as slashCommandState,
} from '@/state/slashCommands';
import { actions, state } from '@/state/suggestion';
import type { ContextItem, ContextStoreValue } from '@/types/context';

export const useSuggestion = (selectedValues?: readonly string[]) => {
  const { fileList, loading } = useSnapshot(state);
  const { t } = useTranslation();
  const {
    commands,
    searchResults,
    loading: slashCommandLoading,
  } = useSnapshot(slashCommandState);

  useEffect(() => {
    actions.getFileList({ maxSize: CONTEXT_MAX_POPUP_ITEM_COUNT });
    slashCommandActions.loadCommands();
  }, []);

  const fileSuggestions = useMemo(() => {
    return fileList.map((file) => {
      const label = file.type === 'file' ? file.name : file.path;
      const extra =
        file.type === 'file'
          ? file.path.split('/').slice(0, -1).join('/')
          : null;

      return {
        label: label,
        value: file.path,
        icon: (
          <DevFileIcon
            isFolder={file.type === 'directory'}
            fileExt={file.path.split('.').pop() ?? ''}
          />
        ),
        disabled: selectedValues?.includes(file.path),
        extra,
      };
    });
  }, [fileList]);

  const slashCommandSuggestions = useMemo(() => {
    // 如果有搜索结果，使用搜索结果，否则使用全部命令
    const targetCommands = searchResults.length > 0 ? searchResults : commands;

    return targetCommands.map((command) => {
      return {
        label: command.name,
        value: `/${command.name}`,
        disabled: selectedValues?.includes(command.name),
        extra: command.description,
      };
    });
  }, [commands, searchResults, selectedValues]);

  const getOriginalFile = (value: string) => {
    return fileList.find((file) => file.path === value);
  };

  const getOriginalCommand = (value: string) => {
    const command = slashCommandActions.getByName(value);
    if (command) {
      return {
        ...command,
        uid: command.name,
      };
    }
    return command;
  };

  const defaultSuggestions = useMemo(() => {
    return [
      {
        label: t('common.slashCommands'),
        value: ContextType.SLASH_COMMAND,
        icon: <MessageOutlined />,
        extra: <ArrowRightOutlined />,
        children: slashCommandSuggestions,
      },
      {
        label: t('common.filesAndFolders'),
        value: ContextType.FILE,
        icon: <FileSearchOutlined />,
        extra: <ArrowRightOutlined />,
        children: fileSuggestions,
      },
    ] as SuggestionItem[];
  }, [fileSuggestions, slashCommandSuggestions, t]);

  const originalContextGetterMap: {
    [key in ContextType]?: (value: string) => ContextStoreValue | undefined;
  } = {
    [ContextType.FILE]: getOriginalFile,
    [ContextType.SLASH_COMMAND]: getOriginalCommand,
  };

  const searchFunctionMap: { [key in ContextType]?: (text: string) => void } = {
    [ContextType.FILE]: (text) =>
      actions.getFileList({
        maxSize: CONTEXT_MAX_POPUP_ITEM_COUNT,
        searchString: text,
      }),
    [ContextType.SLASH_COMMAND]: (text) => {
      // 异步搜索，结果会更新到slashCommandState中
      slashCommandActions.searchWithTextQuery(text, {
        pageSize: CONTEXT_MAX_POPUP_ITEM_COUNT,
      });
    },
  };

  const handleSearch = debounce((type: ContextType, text: string) => {
    const targetFunction = searchFunctionMap[type];

    targetFunction?.(text);
  }, 500);

  const handleClearSearch = (type: ContextType) => {
    if (type === ContextType.SLASH_COMMAND) {
      slashCommandActions.clearSearch();
    }
  };

  const getOriginalContextByValue = (type: ContextType, value: string) => {
    const config = AI_CONTEXT_NODE_CONFIGS.find(
      (config) => config.type === type,
    );
    const getOriginalContext = originalContextGetterMap[type];
    const originalContext = getOriginalContext?.(value);
    const contextItemValue = config?.valueFormatter?.(value) || value;

    const contextItem: ContextItem = {
      type,
      context: originalContext,
      value: contextItemValue,
      displayText: value,
    };

    return contextItem;
  };

  return {
    getOriginalContextByValue,
    defaultSuggestions,
    handleSearch,
    handleClearSearch,
    loading: loading || slashCommandLoading,
  };
};
