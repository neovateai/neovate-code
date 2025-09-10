import { CheckOutlined, ExpandAltOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CodeRenderer from '@/components/CodeRenderer';
import MessageWrapper from '@/components/MessageWrapper';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import ReadFileIcon from '@/icons/readFile.svg?react';
import * as codeViewer from '@/state/codeViewer';
import * as fileChanges from '@/state/fileChanges';
import type { ToolMessage } from '@/types/message';
import type { IReadToolArgs, IReadToolResult } from '@/types/tool';

export default function ReadRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;

  const { args, result } = message as unknown as {
    args: IReadToolArgs;
    result: IReadToolResult;
  };

  const { writeText } = useClipboard();
  const [isCopySuccess, setIsCopySuccess] = useState(false);

  const file_path = args?.file_path;
  const language = useMemo(
    () => args?.file_path?.split('.').pop() || 'text',
    [args?.file_path],
  );
  const code = result?.data?.content || '';

  const handleCopy = useCallback(() => {
    if (!code) return;
    writeText(code);
    setIsCopySuccess(true);
  }, [code, writeText]);

  const handleShowCodeViewer = useCallback(() => {
    if (!file_path || !code) return;
    fileChanges.fileChangesActions.updateCodeViewerState(
      file_path,
      code,
      code,
      'new',
    );
    codeViewer.actions.setVisible(true);
  }, [file_path, code]);

  useEffect(() => {
    if (isCopySuccess) {
      const timer = setTimeout(() => {
        setIsCopySuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopySuccess]);

  const actions = useMemo(
    () => [
      {
        key: 'copy',
        icon: isCopySuccess ? <CheckOutlined /> : <CopyIcon />,
        onClick: handleCopy,
        disabled: !code,
      },
      {
        key: 'expand',
        icon: <ExpandAltOutlined />,
        onClick: handleShowCodeViewer,
        disabled: !file_path || !code,
      },
    ],
    [isCopySuccess, handleCopy, handleShowCodeViewer, code, file_path],
  );

  if (!file_path) {
    return (
      <MessageWrapper
        title="文件读取错误"
        icon={<ReadFileIcon />}
        defaultExpanded={true}
      >
        <div style={{ color: '#ff4d4f', padding: '8px 0' }}>
          无法读取文件：文件路径未提供
        </div>
      </MessageWrapper>
    );
  }

  if (!code) {
    return (
      <MessageWrapper
        title={file_path}
        icon={<ReadFileIcon />}
        defaultExpanded={true}
        actions={actions}
      >
        <div style={{ color: '#faad14', padding: '8px 0' }}>
          文件内容为空或读取失败
        </div>
      </MessageWrapper>
    );
  }

  return (
    <MessageWrapper
      title={file_path}
      icon={<ReadFileIcon />}
      defaultExpanded={true}
      actions={actions}
    >
      <CodeRenderer
        code={code}
        language={language}
        filename={file_path}
        showLineNumbers={true}
      />
    </MessageWrapper>
  );
}
