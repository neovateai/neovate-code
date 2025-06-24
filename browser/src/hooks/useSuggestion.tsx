import { ArrowRightOutlined, FileSearchOutlined } from '@ant-design/icons';
import { Suggestion } from '@ant-design/x';
import { type GetProp } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import DevFileIcon from '@/components/DevFileIcon';
import { AI_CONTEXT_NODE_CONFIGS, ContextType } from '@/constants/context';
import { actions, state } from '@/state/suggestion';
import type { ContextItem, ContextStoreValue } from '@/types/context';

type SuggestionItems = Exclude<GetProp<typeof Suggestion, 'items'>, () => void>;

const useStyle = createStyles(({ css }) => {
  return {
    label: css`
      font-weight: 600;
    `,
  };
});

export const useSuggestion = (
  searchText: string,
  selectedValues?: readonly string[],
) => {
  const { fileList } = useSnapshot(state);
  const [currentContextType, setCurrentContextType] = useState(
    ContextType.UNKNOWN,
  );

  const { styles } = useStyle();

  useEffect(() => {
    actions.getFileList();
  }, []);

  const files = useMemo(() => {
    return fileList.map((file) => {
      const label = file.type === 'file' ? file.name : file.path;
      const extra =
        file.type === 'file'
          ? file.path.split('/').slice(0, -1).join('/')
          : null;

      return {
        label: <div className={styles.label}>{label}</div>,
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
      },
    ] as SuggestionItems;
  }, []);

  const suggentionMap = useMemo<{
    [key in ContextType]?: SuggestionItems;
  }>(() => {
    return {
      [ContextType.UNKNOWN]: defaultSuggestions,
      [ContextType.FILE]: files,
    };
  }, [files, defaultSuggestions]);

  const originalContextGetterMap: {
    [key in ContextType]?: (value: string) => ContextStoreValue | undefined;
  } = {
    [ContextType.FILE]: getOriginalFile,
  };

  const showSearch = useMemo(
    () => currentContextType === ContextType.FILE,
    [currentContextType],
  );

  const suggestions = useMemo(() => {
    const originalArray = suggentionMap[currentContextType] ?? [];
    if (showSearch && searchText) {
      return originalArray.filter((item) => item.value.includes(searchText));
    }

    return originalArray;
  }, [suggentionMap, currentContextType, searchText, showSearch]);

  const handleValue = (value: string) => {
    if (Object.values(ContextType).includes(value as ContextType)) {
      setCurrentContextType(value as ContextType);

      return null;
    } else {
      const type = currentContextType;
      const config = AI_CONTEXT_NODE_CONFIGS.find(
        (config) => config.type === type,
      );

      const getOriginalContext = originalContextGetterMap[currentContextType];
      const originalContext = getOriginalContext?.(value);
      const contextItemValue = config?.valueFormatter?.(value) || value;

      setCurrentContextType(ContextType.UNKNOWN);

      const contextItem: ContextItem = {
        type,
        context: originalContext,
        value: contextItemValue,
        displayText: value,
      };

      return contextItem;
    }
  };

  return {
    suggestions,
    showSearch,
    handleValue,
    setCurrentContextType,
    currentContextType,
  };
};
