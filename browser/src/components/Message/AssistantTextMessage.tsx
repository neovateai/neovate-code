import { createStyles } from 'antd-style';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { MessageAnnotation, TextMessage } from '@/types/message';

const useStyles = createStyles(({ token, css }) => ({
  markdownContainer: css`
    line-height: ${token.lineHeight};
    word-break: break-word;

    code {
      background: ${token.colorFillTertiary};
      padding: 2px 4px;
      border-radius: ${token.borderRadiusSM}px;
      font-family: 'Consolas', 'Monaco', 'monospace';
    }

    pre {
      background: ${token.colorFillSecondary};
      padding: ${token.paddingSM}px;
      border-radius: ${token.borderRadius}px;
      overflow: auto;

      code {
        background: transparent;
        padding: 0;
      }
    }
  `,
}));

const AssistantTextMessage: React.FC<{
  message: TextMessage;
  annotations?: MessageAnnotation[];
}> = ({ message, annotations = [] }) => {
  const { styles } = useStyles();

  const content = useMemo(() => {
    if (annotations?.length > 0) {
      const textAnnotation = annotations.find((item) => item.type === 'text');
      return textAnnotation?.text || message.text;
    }
    return message.text;
  }, [annotations, message.text]);

  const components: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      if (language) {
        return (
          <SyntaxHighlighter style={tomorrow} language={language} PreTag="div">
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className={styles.markdownContainer}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
};

export default AssistantTextMessage;
