import {
  BookOutlined,
  CodeOutlined,
  FileOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { Suggestion } from '@ant-design/x';
import { useSnapshot } from '@umijs/max';
import { GetProp } from 'antd';
import { useEffect, useMemo } from 'react';
import { actions, state } from '@/state/suggestion';

type SuggestionItems = Exclude<GetProp<typeof Suggestion, 'items'>, () => void>;

export const useSuggestion = () => {
  const { fileList } = useSnapshot(state);

  useEffect(() => {
    actions.getFileList();
  }, []);

  const suggestions = useMemo(() => {
    return [
      {
        label: 'Files & Folders',
        value: 'files',
        icon: <FileSearchOutlined />,
        children: [
          ...fileList.slice(0, 10).map((file) => ({
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

  return {
    suggestions,
    fileList,
  };
};
