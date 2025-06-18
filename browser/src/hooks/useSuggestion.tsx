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
import { ContextType } from '@/constants/ContextType';
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
            icon: <FileOutlined />,
            disabled: selectedValues?.includes(file.path),
          })),
        ],
      },
      { label: 'Code', value: ContextType.CODE, icon: <CodeOutlined /> },
      {
        label: 'Knowledge',
        value: ContextType.KNOWLEDGE,
        extra: 'Check some knowledge',
        icon: <BookOutlined />,
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

  const getTypeByValue = (value: string) => {
    if (fileList.findIndex((file) => file.path === value) > -1) {
      return ContextType.FILE;
    }

    return ContextType.UNKNOWN;
  };

  return {
    suggestions,
    fileList,
    getTypeByValue,
  };
};
