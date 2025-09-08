import { CheckOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import { useState } from 'react';
import CodeRenderer from '@/components/CodeRenderer';
import MessageWrapper from '@/components/MessageWrapper';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import EditIcon from '@/icons/edit.svg?react';
import { fileChangesActions } from '@/state/fileChanges';
import type { ToolMessage } from '@/types/message';

// write tool认为都是新增的
export default function WriteRender({ message }: { message?: ToolMessage }) {
  if (!message) {
    return null;
  }
  const { toolCallId, args } = message;
  const { writeText } = useClipboard();
  const [isCopySuccess, setIsCopySuccess] = useState(false);

  const { file_path, content } = args as {
    file_path: string;
    content: string;
  };

  useEffect(() => {
    fileChangesActions.initNewFileState(file_path, content, [
      {
        toolCallId,
        old_string: '',
        new_string: content,
      },
    ]);
  }, [file_path, content, toolCallId]);

  const handleCopy = () => {
    writeText(content);
    setIsCopySuccess(true);
  };

  return (
    <MessageWrapper
      title={file_path}
      icon={<EditIcon />}
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
      footers={[
        {
          key: 'apply',
          text: '接受',
          onClick: () => {},
        },
        {
          key: 'reject',
          text: '拒绝',
          onClick: () => {},
        },
      ]}
    >
      <CodeRenderer
        mode="diff"
        originalCode=""
        modifiedCode={content}
        code={content}
        filename={file_path}
        showLineNumbers={true}
      />
    </MessageWrapper>
  );
}
