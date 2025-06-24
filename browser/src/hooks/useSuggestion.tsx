import {
  BookOutlined,
  CodeOutlined,
  FileOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { Suggestion } from '@ant-design/x';
import { type GetProp } from 'antd';
import { useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import DevFileIcon from '@/components/DevFileIcon';
import { ContextType } from '@/constants/context';
import { actions, state } from '@/state/suggestion';

type SuggestionItems = Exclude<GetProp<typeof Suggestion, 'items'>, () => void>;

export const useSuggestion = (
  searchText: string,
  selectedValues?: readonly string[],
) => {
  const { fileList } = useSnapshot(state);

  useEffect(() => {
    actions.getFileList();
  }, []);

  const defaultSuggestions = useMemo(() => {
    return [
      {
        label: 'Files & Folders',
        value: ContextType.FILE,
        icon: <FileSearchOutlined />,
        children: [
          ...fileList.map((file) => ({
            label: file.path,
            value: file.path,
            icon: (
              <DevFileIcon
                isFolder={file.type === 'directory'}
                fileExt={file.path.split('.').pop() ?? ''}
              />
            ),
            disabled: selectedValues?.includes(file.path),
          })),
        ],
      },
    ] as SuggestionItems;
  }, [fileList, selectedValues]);

  const suggestions = useMemo(() => {
    if (!searchText) {
      return defaultSuggestions;
    }

    // TODO temporary support for file and folder search
    const searchResult = fileList
      .filter((item) => item.path.includes(searchText))
      .map((item) => ({
        label: item.path,
        value: item.path,
        icon: <FileOutlined />,
      }));

    return searchResult;
  }, [defaultSuggestions, fileList, searchText]);

  /** 根据value获取ContextType */
  const getTypeByValue = (value: string) => {
    if (fileList.findIndex((file) => file.path === value) > -1) {
      return ContextType.FILE;
    }

    return ContextType.UNKNOWN;
  };

  /** 根据value获取原始FileItem */
  const getFileByValue = (value: string) => {
    return fileList.find((file) => file.path === value);
  };

  return {
    suggestions,
    fileList,
    getTypeByValue,
    getFileByValue,
  };
};
