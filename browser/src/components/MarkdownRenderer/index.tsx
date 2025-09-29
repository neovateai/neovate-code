import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Streamdown } from 'streamdown';
import styles from './index.module.css';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const components: Components = {
    blockquote({ children, ...props }) {
      return <blockquote {...props}>{children}</blockquote>;
    },

    a({ href, children, ...props }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    },
  };

  const processedContent = content.includes('```markdown')
    ? content.replace('```markdown', '').replace('```', '')
    : content;

  return (
    <div className={styles.markdownRenderer}>
      <Streamdown
        className="max-w-none prose"
        remarkPlugins={[remarkGfm]}
        components={components}
        skipHtml={false}
        urlTransform={(url) => url}
      >
        {processedContent}
      </Streamdown>
    </div>
  );
};

export default MarkdownRenderer;
