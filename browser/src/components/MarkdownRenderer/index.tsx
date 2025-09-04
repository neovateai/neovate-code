import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Streamdown } from 'streamdown';
import styles from './index.module.css';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const components: Components = {
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
      <Streamdown
        className="prose prose-slate max-w-none"
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
