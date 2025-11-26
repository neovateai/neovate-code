import { Tooltip } from 'antd';
import classNames from 'classnames';
import { useLayoutEffect, useRef, useState } from 'react';

interface TruncateProps {
  children: React.ReactNode;
  className?: string;
}

const Truncate: React.FC<TruncateProps> = ({ children, className }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const checkTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    };

    checkTruncation();

    const resizeObserver = new ResizeObserver(checkTruncation);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [children]);

  return (
    <Tooltip title={isTruncated ? children : null}>
      <div ref={textRef} className={classNames('truncate', className)}>
        {children}
      </div>
    </Tooltip>
  );
};

export default Truncate;
