import { CheckOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useShiki } from '@/components/CodeRenderer';
import MessageWrapper from '@/components/MessageWrapper';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import ReadFileIcon from '@/icons/readFile.svg?react';
import type { ToolMessage } from '@/types/message';
import type { IReadToolArgs, IReadToolResult } from '@/types/tool';

export default function ReadRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;
  const { args, result } = message as unknown as {
    args: IReadToolArgs;
    result: IReadToolResult;
  };

  const { writeText } = useClipboard();
  const { codeToHtml, isReady, error } = useShiki();
  const [isCopySuccess, setIsCopySuccess] = useState(false);

  const file_path = args?.file_path;
  const language = args?.file_path?.split('.').pop() || 'text';
  const code = result?.data?.content || '';

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

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!isReady || !codeToHtml) {
    return <div>Loading syntax highlighter...</div>;
  }

  const highlightedCode = codeToHtml(code, {
    lang: language,
    theme: 'snazzy-light',
  });

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
      <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />{' '}
    </MessageWrapper>
  );
}
