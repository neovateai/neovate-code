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
          <div className={styles.codeContainer}>
            <button
              onClick={() => copyToClipboard(codeString)}
              className={`${styles.copyButton} ${isCopied ? styles.copied : ''}`}
              title={t('markdown.copyCode')}
              aria-label={t('markdown.copyCode')}
            >
              {isCopied ? (
                <CheckOutlined style={{ fontSize: '12px' }} />
              ) : (
                <CopyOutlined style={{ fontSize: '12px' }} />
              )}
            </button>
            <SyntaxHighlighter
              style={tomorrow}
              language={language}
              PreTag={Fragment}
              wrapLines={false}
              customStyle={{
                margin: 0,
                padding: '16px',
                fontSize: '13px',
                lineHeight: '1.5',
                borderRadius: '8px',
              }}
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

    // 自定义表格渲染
    table({ children, ...props }) {
      return (
        <div style={{ overflowX: 'auto', margin: '16px 0' }}>
          <table {...props}>{children}</table>
        </div>
      );
    },

    // 自定义引用块渲染
    blockquote({ children, ...props }) {
      return <blockquote {...props}>{children}</blockquote>;
    },

    // 自定义链接渲染
    a({ href, children, ...props }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
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
        className="prose prose-slate max-w-none"
        remarkPlugins={[remarkGfm]}
        components={components}
        skipHtml={false}
        urlTransform={(url) => url}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
