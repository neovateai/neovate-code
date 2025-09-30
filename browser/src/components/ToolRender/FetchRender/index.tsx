import { LoadingOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import MessageWrapper from '@/components/MessageWrapper';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import SearchIcon from '@/icons/search.svg?react';
import type { UIToolPart } from '@/types/chat';
import { jsonSafeParse } from '@/utils/message';

export default function FetchRender({ part }: { part: UIToolPart }) {
  const { input, state, result } = part;

  const { writeText } = useClipboard();

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

  const llmContent = useMemo(() => {
    if (typeof result?.llmContent === 'string') {
      return jsonSafeParse(result?.llmContent)?.result;
    }
    return null;
  }, [result?.llmContent]);

  return (
    <MessageWrapper
      icon={<SearchIcon />}
      title={`${prompt} ${url}`}
      actions={actions}
    >
      <div className="text-sm text-gray-500 whitespace-pre-wrap">
        {llmContent}
      </div>
    </MessageWrapper>
  );
}
