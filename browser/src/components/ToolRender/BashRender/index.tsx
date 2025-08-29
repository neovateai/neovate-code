import { CheckOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useShiki } from '@/components/CodeRenderer';
import MessageWrapper from '@/components/MessageWrapper';
import { useClipboard } from '@/hooks/useClipboard';
import BashIcon from '@/icons/bash.svg?react';
import CopyIcon from '@/icons/copy.svg?react';
import ExpandIcon from '@/icons/expand.svg?react';
import type { ToolMessage } from '@/types/message';
import type { IBashToolResult } from '@/types/tool';

export default function BashRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;
  const { args, result } = message;
  const command = (args?.command as string) || '';
  const { message: stdout } = (result as IBashToolResult) || {};

  const { writeText } = useClipboard();
  const { codeToHtml, isReady, error } = useShiki();
  const [isCopySuccess, setIsCopySuccess] = useState(false);
  const [highlightedOutput, setHighlightedOutput] = useState<string>('');

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

  // 高亮命令输出
  useEffect(() => {
    if (!stdout || !isReady || !codeToHtml) {
      setHighlightedOutput('');
      return;
    }

    try {
      const html = codeToHtml(stdout, {
        lang: 'bash',
        theme: 'snazzy-light',
      });
      setHighlightedOutput(html);
    } catch (err) {
      console.warn('Failed to highlight bash output:', err);
      setHighlightedOutput('');
    }
  }, [stdout, codeToHtml, isReady]);

  // 错误处理
  if (error) {
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
          {
            key: 'expand',
            icon: <ExpandIcon />,
            onClick: () => {},
          },
        ]}
      >
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {stdout}
        </pre>
      </MessageWrapper>
    );
  }

  // 加载中状态
  if (!isReady && stdout) {
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
          {
            key: 'expand',
            icon: <ExpandIcon />,
            onClick: () => {},
          },
        ]}
      >
        <div>正在加载语法高亮...</div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {stdout}
        </pre>
      </MessageWrapper>
    );
  }

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
        {
          key: 'expand',
          icon: <ExpandIcon />,
          onClick: () => {},
        },
      ]}
    >
      {highlightedOutput ? (
        <div dangerouslySetInnerHTML={{ __html: highlightedOutput }} />
      ) : (
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {stdout}
        </pre>
      )}
    </MessageWrapper>
  );
}
