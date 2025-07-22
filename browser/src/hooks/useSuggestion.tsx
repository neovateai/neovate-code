import { ArrowRightOutlined, FileSearchOutlined } from '@ant-design/icons';
import { debounce } from 'lodash-es';
import { useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import DevFileIcon from '@/components/DevFileIcon';
import type { SuggestionItem } from '@/components/SuggestionList';
import {
  AI_CONTEXT_NODE_CONFIGS,
  CONTEXT_MAX_POPUP_ITEM_COUNT,
  ContextType,
} from '@/constants/context';
import { actions, state } from '@/state/suggestion';
import type { ContextItem, ContextStoreValue } from '@/types/context';

export const useSuggestion = (selectedValues?: readonly string[]) => {
  const { fileList, loading } = useSnapshot(state);

  useEffect(() => {
    actions.getFileList({ maxSize: CONTEXT_MAX_POPUP_ITEM_COUNT });
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

  const getOriginalFile = (value: string) => {
    return fileList.find((file) => file.path === value);
  };

  const defaultSuggestions = useMemo(() => {
    return [
      {
        label: 'Files & Folders',
        value: ContextType.FILE,
        icon: <FileSearchOutlined />,
        extra: <ArrowRightOutlined />,
        children: fileSuggestions,
      },
    ] as SuggestionItem[];
  }, [fileSuggestions]);

  const originalContextGetterMap: {
    [key in ContextType]?: (value: string) => ContextStoreValue | undefined;
  } = {
    [ContextType.FILE]: getOriginalFile,
  };

  const searchFunctionMap: { [key in ContextType]?: (text: string) => void } = {
    [ContextType.FILE]: (text) =>
      actions.getFileList({
        maxSize: CONTEXT_MAX_POPUP_ITEM_COUNT,
        searchString: text,
      }),
  };

  const handleSearch = debounce((type: ContextType, text: string) => {
    const targetFunction = searchFunctionMap[type];

    targetFunction?.(text);
  }, 500);

  const getOriginalContextByValue = (opts: {
    type: ContextItem['type'];
    value: string;
    remainAfterSend?: ContextItem['remainAfterSend'];
  }) => {
    const { type, value, remainAfterSend } = opts;

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
      remainAfterSend,
    };

    return contextItem;
  };

  return {
    getOriginalContextByValue,
    defaultSuggestions,
    handleSearch,
    loading,
  };
};
