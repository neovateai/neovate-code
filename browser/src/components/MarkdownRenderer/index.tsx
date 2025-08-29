import { CheckOutlined, CodeOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useShiki } from '@/components/CodeRenderer';
import MessageWrapper from '@/components/MessageWrapper';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import styles from './index.module.css';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const { t } = useTranslation();
  const { writeText } = useClipboard();
  const { codeToHtml, isReady } = useShiki();
  const [isCopySuccess, setIsCopySuccess] = useState(false);

  if (!isReady || !codeToHtml) {
    return <div>Loading syntax highlighter...</div>;
  }

  const copyToClipboard = async (code: string) => {
    try {
      await writeText(code);
      setIsCopySuccess(true);
      message.success(t('markdown.copySuccess'));

      // 2秒后重置复制状态
      setTimeout(() => {
        setIsCopySuccess(false);
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

      const highlightedCode = codeToHtml(codeString, {
        lang: language,
        theme: 'snazzy-light',
      });

      if (language) {
        return (
          <MessageWrapper
            title={language}
            icon={<CodeOutlined />}
            defaultExpanded={true}
            actions={[
              {
                key: 'copy',
                icon: isCopySuccess ? <CheckOutlined /> : <CopyIcon />,
                onClick: () => copyToClipboard(codeString),
              },
            ]}
          >
            <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          </MessageWrapper>
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
