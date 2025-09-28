import { CheckOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import CodeRenderer from '@/components/CodeRenderer';
import MessageWrapper from '@/components/MessageWrapper';
import { useClipboard } from '@/hooks/useClipboard';
import BashIcon from '@/icons/bash.svg?react';
import CopyIcon from '@/icons/copy.svg?react';
import type { UIToolPart } from '@/types/chat';

export default function BashRender({ part }: { part: UIToolPart }) {
  const { input, result } = part;
  const command = (input?.command as string) || '';
  const llmContent = result?.llmContent as string;

  const { writeText } = useClipboard();
  const [isCopySuccess, setIsCopySuccess] = useState(false);

  const handleCopy = () => {
    writeText(llmContent || '');
    setIsCopySuccess(true);
  };

  useEffect(() => {
    if (isCopySuccess) {
      const timer = setTimeout(() => {
        setIsCopySuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopySuccess]);

  return (
    <MessageWrapper
      title={command}
      icon={<BashIcon />}
      showExpandIcon={false}
      expandable={false}
      expanded={!!llmContent?.length}
      actions={[
        {
          key: 'copy',
          icon: isCopySuccess ? <CheckOutlined /> : <CopyIcon />,
          onClick: handleCopy,
        },
      ]}
    >
      {llmContent ? (
        <CodeRenderer
          code={llmContent}
          language="bash"
          showLineNumbers={false}
        />
      ) : null}
    </MessageWrapper>
  );
}
