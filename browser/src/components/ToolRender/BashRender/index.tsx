import { CheckOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import CodeRenderer from '@/components/CodeRenderer';
import MessageWrapper from '@/components/MessageWrapper';
import { useClipboard } from '@/hooks/useClipboard';
import BashIcon from '@/icons/bash.svg?react';
import CopyIcon from '@/icons/copy.svg?react';
import type { ToolMessage } from '@/types/message';
import type { IBashToolResult } from '@/types/tool';

export default function BashRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;
  const { args, result } = message;
  const command = (args?.command as string) || '';
  const { message: stdout } = (result as IBashToolResult) || {};

  const { writeText } = useClipboard();
  const [isCopySuccess, setIsCopySuccess] = useState(false);

  const handleCopy = () => {
    writeText(stdout || '');
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
      expanded={!!stdout?.length}
      actions={[
        {
          key: 'copy',
          icon: isCopySuccess ? <CheckOutlined /> : <CopyIcon />,
          onClick: handleCopy,
        },
      ]}
    >
      {stdout ? (
        <CodeRenderer code={stdout} language="bash" showLineNumbers={false} />
      ) : null}
    </MessageWrapper>
  );
}
