import { Tooltip } from 'antd';
import type React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

interface Props
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > {
  maxWidth?: number;
}

const AutoTooltip = (props: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showTip, setShowTip] = useState(false);

  useLayoutEffect(() => {
    if (ref.current) {
      if (ref.current.scrollWidth > ref.current.clientWidth) {
        setShowTip(true);
      } else {
        setShowTip(false);
      }
    }
  }, []);

  return (
    <Tooltip title={showTip ? props.children : null}>
      <div
        {...props}
        style={Object.assign({}, props.style, {
          maxWidth: props.maxWidth,
          textOverflow: 'ellipsis',
          overflow: 'hidden',
        } as React.CSSProperties)}
        ref={ref}
      />
    </Tooltip>
  );
};

export default AutoTooltip;
