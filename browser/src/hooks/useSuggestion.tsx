import { ArrowRightOutlined, FileSearchOutlined } from '@ant-design/icons';
import { Suggestion } from '@ant-design/x';
import { type GetProp } from 'antd';
import { useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import DevFileIcon from '@/components/DevFileIcon';
import { AI_CONTEXT_NODE_CONFIGS, ContextType } from '@/constants/context';
import { actions, state } from '@/state/suggestion';
import type { ContextItem, ContextStoreValue } from '@/types/context';

type SuggestionItems = Exclude<GetProp<typeof Suggestion, 'items'>, () => void>;

export const useSuggestion = (selectedValues?: readonly string[]) => {
  const { fileList } = useSnapshot(state);

  useEffect(() => {
    actions.getFileList();
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
    ] as SuggestionItems;
  }, [fileSuggestions]);

  const originalContextGetterMap: {
    [key in ContextType]?: (value: string) => ContextStoreValue | undefined;
  } = {
    [ContextType.FILE]: getOriginalFile,
  };

  // TODO 服务端搜索
  const handleSearch = (type: ContextType, text: string) => {
    const targetSuggestions = defaultSuggestions.find(
      (s) => s.value === type,
    )?.children;
    return targetSuggestions?.filter((suggestion) =>
      suggestion.value.includes(text),
    );
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
  };
};
