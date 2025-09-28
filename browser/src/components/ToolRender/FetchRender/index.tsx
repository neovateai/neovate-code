import { LoadingOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import MessageWrapper from '@/components/MessageWrapper';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import SearchIcon from '@/icons/search.svg?react';
import type { UIToolPart } from '@/types/chat';

export default function FetchRender({ part }: { part: UIToolPart }) {
  const { input, state } = part;

  const { writeText } = useClipboard();

  console.log('FetchRender', part);

  const url = (input?.url as string) || '';
  const prompt = (input?.prompt as string) || '';

  const actions = useMemo(() => {
    if (state === 'tool_result') {
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
