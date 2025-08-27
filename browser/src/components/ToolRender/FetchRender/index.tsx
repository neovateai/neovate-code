import { LoadingOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import MessageWrapper from '@/components/MessageWrapper';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import SearchIcon from '@/icons/search.svg?react';
import type { ToolMessage } from '@/types/message';

export default function FetchRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;

  const { args, state } = message;

  const { writeText } = useClipboard();

  const url = (args?.url as string) || '';
  const prompt = (args?.prompt as string) || '';

  const actions = useMemo(() => {
    if (state === 'result') {
      return [
        {
          key: 'success',
          icon: <CopyIcon />,
          onClick: () => {
            writeText(url);
          },
        },
      ];
    }

    return [
      {
        key: 'loading',
        icon: (
          <LoadingOutlined spin style={{ color: '#1890ff', fontSize: 14 }} />
        ),
      },
    ];
  }, [state]);

  return (
    <MessageWrapper
      icon={<SearchIcon />}
      title={`${prompt} ${url}`}
      expandable={false}
      defaultExpanded={false}
      showExpandIcon={false}
      actions={actions}
    />
  );
}
