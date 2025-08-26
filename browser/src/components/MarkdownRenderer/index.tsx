import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { useClipboard } from '@/hooks/useClipboard';
import styles from './index.module.css';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const { t } = useTranslation();
  const { writeText } = useClipboard();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (code: string) => {
    try {
      await writeText(code);
      setCopiedCode(code);
      message.success(t('markdown.copySuccess'));

      // 2秒后重置复制状态
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    } catch (err) {
      message.error(t('markdown.copyFailed'));
    }
  };

  const components: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');

      if (language) {
        const isCopied = copiedCode === codeString;

        return (
          <div className="relative group">
            <button
              onClick={() => copyToClipboard(codeString)}
              className="absolute right-2 top-2 z-10 p-1.5  rounded bg-gray-700 hover:bg-gray-600 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
              title={t('markdown.copyCode')}
            >
              {isCopied ? (
                <CheckOutlined className="text-green-400" />
              ) : (
                <CopyOutlined />
              )}
            </button>
            <SyntaxHighlighter
              style={tomorrow}
              language={language}
              PreTag={Fragment}
              wrapLines={false}
              customStyle={{ margin: 0, padding: '1rem' }}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  // 处理markdown格式时，存在的```markdown```，需要去掉
  const processedContent = content.includes('```markdown')
    ? content.replace('```markdown', '').replace('```', '')
    : content;

  return (
    <div className={styles.markdownRenderer}>
      <ReactMarkdown
        className="prose"
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
