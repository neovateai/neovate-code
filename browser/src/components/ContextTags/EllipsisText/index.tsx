import {
  type DetailedHTMLProps,
  type HTMLAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';

interface Props
  extends DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement> {
  maxWidth: number;
  children?: string;
}

const EllipsisText = (props: Props) => {
  const { maxWidth, children, style, ...restProps } = props;
  const containerRef = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(children);
  const [originalText, setOriginalText] = useState(children);

  useEffect(() => {
    setOriginalText(children);
    setText(children);
  }, [children]);

  useEffect(() => {
    const checkOverflow = () => {
      const container = containerRef.current;
      if (!container) return;

      const textWidth = container.scrollWidth;

      if (textWidth > maxWidth) {
        // 文本溢出，需要添加中间省略号
        const str = originalText || '';
        const mid = Math.floor(str.length / 2);
        let left = mid;
        let right = mid + 1;
        let result = str;

        // 二分查找合适的截断点
        while (left >= 0 && right <= str.length) {
          const newStr = str.substring(0, left) + '...' + str.substring(right);
          container.textContent = newStr;
          if (container.scrollWidth <= maxWidth) {
            result = newStr;
            break;
          }
          left--;
          right++;
        }

        setText(result);
      } else {
        // 文本未溢出，显示完整内容
        setText(originalText);
      }
    };

    checkOverflow();

    // 添加resize事件监听
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [originalText, maxWidth]);
  return (
    <span
      ref={containerRef}
      style={Object.assign(
        {
          display: 'inline-block',
          maxWidth: `${maxWidth}px`,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          verticalAlign: 'bottom',
          margin: 0,
        },
        style,
      )}
      title={originalText}
      {...restProps}
    >
      {text}
    </span>
  );
};

export default EllipsisText;
