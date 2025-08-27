import { type GetProps, Tooltip } from 'antd';
import React, { useLayoutEffect, useRef, useState } from 'react';

interface Props
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > {
  maxWidth?: number;
  ellipsisAtStart?: boolean;
  forceShowTip?: boolean;
  placement?: GetProps<typeof Tooltip>['placement'];
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
  }, [props.children, props.maxWidth, props.ellipsisAtStart]);

  return (
    <Tooltip
      title={showTip ? props.children : null}
      open={showTip && props.forceShowTip}
      placement={props.placement}
      classNames={{
        body: 'text-black!',
      }}
      color="#fff"
    >
      <div
        {...props}
        style={Object.assign({}, props.style, {
          maxWidth: props.maxWidth,
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          direction: props.ellipsisAtStart ? 'rtl' : 'ltr',
          textAlign: props.ellipsisAtStart ? 'right' : 'left',
        } as React.CSSProperties)}
        ref={ref}
      />
    </Tooltip>
  );
};

export default AutoTooltip;
