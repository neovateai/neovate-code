import { CheckOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import MessageWrapper from '@/components/MessageWrapper';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import ReadFileIcon from '@/icons/readFile.svg?react';
import type { ToolMessage } from '@/types/message';
import type { IReadToolResult } from '@/types/tool';

export default function ReadRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;
  const { args, result } = message;

  const { writeText } = useClipboard();
  const [isCopySuccess, setIsCopySuccess] = useState(false);

  const file_path = args?.file_path as string;
  const code = (result?.data as IReadToolResult)?.content as string;

  const handleCopy = () => {
    writeText(code);
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
      title={file_path}
      icon={<ReadFileIcon />}
      showExpandIcon={false}
      expandable={false}
      defaultExpanded={true}
      actions={[
        {
          key: 'copy',
          icon: isCopySuccess ? <CheckOutlined /> : <CopyIcon />,
          onClick: handleCopy,
        },
      ]}
    >
      {code}
    </MessageWrapper>
  );
}
