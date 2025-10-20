import { CheckOutlined, ExpandAltOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CodeRenderer from '@/components/CodeRenderer';
import MessageWrapper from '@/components/MessageWrapper';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import ReadFileIcon from '@/icons/readFile.svg?react';
import * as codeViewer from '@/state/codeViewer';
import type { UIToolPart } from '@/types/chat';
import { jsonSafeParse } from '@/utils/message';

export default function ReadRender({ part }: { part: UIToolPart }) {
  const { input, result } = part;

  const { writeText } = useClipboard();
  const [isCopySuccess, setIsCopySuccess] = useState(false);
  const { t } = useTranslation();

  const file_path = input?.file_path;
  const language = useMemo(
    () => input?.file_path?.split('.').pop() || 'text',
    [input?.file_path],
  );

  const content = useMemo(() => {
    if (typeof result?.llmContent === 'string') {
      return jsonSafeParse(result?.llmContent);
    }
    return null;
  }, [result?.llmContent]);

  const code = content?.content || '';

  const handleCopy = useCallback(() => {
    if (!code) return;
    writeText(code);
    setIsCopySuccess(true);
  }, [code, writeText]);

  const handleShowCodeViewer = useCallback(() => {
    if (!file_path || !code) return;
    codeViewer.actions.openCodeViewer(file_path, code, code, 'new');
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
        title={t('toolRenders.error.file.title')}
        icon={<ReadFileIcon />}
        defaultExpanded={true}
      >
        <div style={{ color: '#ff4d4f', padding: '8px 0' }}>
          {t('toolRenders.error.file.pathEmpty')}
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
          {t('toolRenders.error.file.contentEmpty')}
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
