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
import { actions, state } from '@/state/suggestion';

type SuggestionItems = Exclude<GetProp<typeof Suggestion, 'items'>, () => void>;

export const useSuggestion = (searchText?: string) => {
  const { fileList } = useSnapshot(state);

  useEffect(() => {
    actions.getFileList();
  }, []);

  const defaultSuggestions = useMemo(() => {
    return [
      {
        label: 'Files & Folders',
        value: 'files',
        icon: <FileSearchOutlined />,
        children: [
          ...fileList.map((file) => ({
            label: file.path,
            value: file.path,
            icon: <FileOutlined />,
          })),
        ],
      },
      { label: 'Code', value: 'code', icon: <CodeOutlined /> },
      {
        label: 'Knowledge',
        value: 'knowledge',
        extra: 'Check some knowledge',
        icon: <BookOutlined />,
      },
    ] as SuggestionItems;
  }, [fileList]);

  const suggestions = useMemo(() => {
    if (!searchText) {
      return defaultSuggestions;
    }

    // 暂时只支持文件和目录搜索
    const searchResult = fileList
      .filter((item) => item.path.includes(searchText))
      .map((item) => ({
        label: item.path,
        value: item.path,
        icon: <FileOutlined />,
      }));

    return searchResult;
  }, [defaultSuggestions, fileList, searchText]);

  return {
    suggestions,
    fileList,
  };
};
