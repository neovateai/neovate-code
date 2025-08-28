import { type GetProps, Tooltip } from 'antd';
import { cx } from 'antd-style';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

interface Props {
  label: React.ReactNode;
  extra?: React.ReactNode;
  maxWidth?: number;
  gap?: number;
  minExtraWidth?: number;
  showTip?: boolean;
  placement?: GetProps<typeof Tooltip>['placement'];
  renderTooltip?: (
    label: React.ReactNode,
    extra?: React.ReactNode,
  ) => React.ReactNode;
}

type DisplayMode = 'full' | 'extra-truncated' | 'label-truncated';

const SmartText = (props: Props) => {
  const {
    label,
    extra,
    maxWidth = 280,
    gap = 4,
    minExtraWidth = 40,
    showTip,
    placement = 'top',
    renderTooltip,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const extraRef = useRef<HTMLDivElement>(null);

  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  const hasTip = useMemo(() => displayMode !== 'full', [displayMode]);

  const showExtra = useMemo(
    () => displayMode !== 'label-truncated',
    [displayMode],
  );

  useLayoutEffect(() => {
    if (!containerRef.current || !labelRef.current) return;

    const labelEl = labelRef.current;
    const extraEl = extraRef.current;

    const labelWidth = labelEl.scrollWidth;
    const extraWidth = extraEl ? extraEl.scrollWidth : 0;
    const totalNaturalWidth = labelWidth + (extraEl ? extraWidth + gap : 0);

    if (totalNaturalWidth <= maxWidth) {
      // Everything fits, no truncation needed
      setDisplayMode('full');
    } else if (!extra) {
      // Only label, truncate if necessary
      if (labelWidth > maxWidth) {
        setDisplayMode('label-truncated');
      }
    } else {
      // Both label and extra exist
      // Priority: show label completely first, then extra if space allows
      if (labelWidth + gap + extraWidth <= maxWidth) {
        // Both fit perfectly
        setDisplayMode('full');
      } else if (labelWidth >= maxWidth) {
        // Label itself needs more space than available, hide extra and truncate label
        setDisplayMode('label-truncated');
      } else {
        // Label fits, but not enough space for both
        const remainingWidth = maxWidth - labelWidth - gap;

        if (extraWidth <= remainingWidth) {
          // Extra fits in remaining space
          setDisplayMode('full');
        } else {
          // Try to show truncated extra

          if (remainingWidth >= minExtraWidth) {
            // Show truncated extra
            setDisplayMode('extra-truncated');
          } else {
            // Not enough space for meaningful extra, hide it
            setDisplayMode('label-truncated');
          }
        }
      }
    }
  }, [label, extra, maxWidth, gap, minExtraWidth]);

  return (
    <Tooltip
      mouseEnterDelay={0.5}
      title={renderTooltip?.(label, extra)}
      open={hasTip && showTip}
      placement={placement}
      arrow={false}
      classNames={{
        body: 'text-black! w-fit relative left-12',
      }}
      color="#fff"
    >
      <div
        ref={containerRef}
        className="flex items-center"
        style={{ maxWidth }}
      >
        <div
          ref={labelRef}
          className={cx('text-sm text-[#110C22] truncate', {
            'overflow-visible!': displayMode !== 'label-truncated',
          })}
        >
          {label}
        </div>
        {showExtra && extra && (
          <>
            <div className="flex-shrink-0" style={{ width: gap }} />
            <div
              ref={extraRef}
              style={{ direction: 'rtl' }}
              className={cx('text-xs text-gray-500 truncate')}
            >
              {extra}
            </div>
          </>
        )}
      </div>
    </Tooltip>
  );
};

export default SmartText;
