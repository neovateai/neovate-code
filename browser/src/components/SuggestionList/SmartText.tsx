import { type GetProps, Tooltip } from 'antd';
import React, { useLayoutEffect, useRef, useState } from 'react';

interface Props {
  label: React.ReactNode;
  extra?: React.ReactNode;
  maxWidth?: number;
  labelClassName?: string;
  extraClassName?: string;
  forceShowTip?: boolean;
  placement?: GetProps<typeof Tooltip>['placement'];
}

const SmartText = (props: Props) => {
  const {
    label,
    extra,
    maxWidth = 280,
    labelClassName = 'text-sm text-[#110C22]',
    extraClassName = 'text-xs text-gray-500',
    forceShowTip = false,
    placement = 'top',
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const extraRef = useRef<HTMLSpanElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState<React.ReactNode>(null);
  const [displayState, setDisplayState] = useState<{
    showExtra: boolean;
    labelTruncated: boolean;
    extraTruncated: boolean;
  }>({ showExtra: true, labelTruncated: false, extraTruncated: false });

  useLayoutEffect(() => {
    if (!containerRef.current || !labelRef.current) return;

    const labelEl = labelRef.current;
    const extraEl = extraRef.current;
    const availableWidth = maxWidth;
    const gap = 4; // 4px gap between label and extra

    // Reset styles to measure natural widths
    labelEl.style.maxWidth = 'none';
    labelEl.style.overflow = 'visible';
    labelEl.style.textOverflow = 'clip';
    if (extraEl) {
      extraEl.style.maxWidth = 'none';
      extraEl.style.overflow = 'visible';
      extraEl.style.textOverflow = 'clip';
      extraEl.style.direction = 'ltr';
    }

    const labelWidth = labelEl.scrollWidth;
    const extraWidth = extraEl ? extraEl.scrollWidth : 0;
    const totalNaturalWidth = labelWidth + (extraEl ? extraWidth + gap : 0);

    let newDisplayState = {
      showExtra: !!extra,
      labelTruncated: false,
      extraTruncated: false,
    };
    let newTooltipContent: React.ReactNode = null;
    let newShowTooltip = false;

    if (totalNaturalWidth <= availableWidth) {
      // Everything fits, no truncation needed
      newDisplayState.showExtra = !!extra;
    } else if (!extra) {
      // Only label, truncate if necessary
      if (labelWidth > availableWidth) {
        newDisplayState.labelTruncated = true;
        labelEl.style.maxWidth = `${availableWidth}px`;
        labelEl.style.overflow = 'hidden';
        labelEl.style.textOverflow = 'ellipsis';
        newTooltipContent = label;
        newShowTooltip = true;
      }
    } else {
      // Both label and extra exist
      // Priority: show label completely first, then extra if space allows

      if (labelWidth + gap + extraWidth <= availableWidth) {
        // Both fit perfectly
        newDisplayState.showExtra = true;
      } else if (labelWidth >= availableWidth) {
        // Label itself needs more space than available, hide extra and truncate label
        newDisplayState.showExtra = false;
        newDisplayState.labelTruncated = true;
        labelEl.style.maxWidth = `${availableWidth}px`;
        labelEl.style.overflow = 'hidden';
        labelEl.style.textOverflow = 'ellipsis';
        newTooltipContent = (
          <div>
            <div>{label}</div>
            <div className="text-gray-500 text-xs mt-1">{extra}</div>
          </div>
        );
        newShowTooltip = true;
      } else {
        // Label fits, but not enough space for both
        const remainingWidth = availableWidth - labelWidth - gap;

        if (extraWidth <= remainingWidth) {
          // Extra fits in remaining space
          newDisplayState.showExtra = true;
        } else {
          // Try to show truncated extra
          const minExtraWidth = 40; // Minimum meaningful width for extra

          if (remainingWidth >= minExtraWidth) {
            // Show truncated extra
            newDisplayState.showExtra = true;
            newDisplayState.extraTruncated = true;
            if (extraEl) {
              extraEl.style.maxWidth = `${remainingWidth}px`;
              extraEl.style.overflow = 'hidden';
              extraEl.style.textOverflow = 'ellipsis';
              extraEl.style.direction = 'rtl';
              extraEl.style.textAlign = 'right';
            }
            newTooltipContent = (
              <div>
                <div>{label}</div>
                <div className="text-gray-500 text-xs mt-1">{extra}</div>
              </div>
            );
            newShowTooltip = true;
          } else {
            // Not enough space for meaningful extra, hide it
            newDisplayState.showExtra = false;
            newTooltipContent = (
              <div>
                <div>{label}</div>
                <div className="text-gray-500 text-xs mt-1">{extra}</div>
              </div>
            );
            newShowTooltip = true;
          }
        }
      }
    }

    setDisplayState(newDisplayState);
    setTooltipContent(newTooltipContent);
    setShowTooltip(newShowTooltip);
  }, [label, extra, maxWidth]);

  return (
    <Tooltip
      title={showTooltip ? tooltipContent : null}
      open={showTooltip && forceShowTip}
      placement={placement}
      classNames={{
        body: 'text-black!',
      }}
      color="#fff"
    >
      <div
        ref={containerRef}
        className="flex items-center"
        style={{ maxWidth }}
      >
        <span
          ref={labelRef}
          className={labelClassName}
          style={{
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
        {displayState.showExtra && extra && (
          <>
            <span className="w-1 flex-shrink-0" />
            <span
              ref={extraRef}
              className={extraClassName}
              style={{
                whiteSpace: 'nowrap',
              }}
            >
              {extra}
            </span>
          </>
        )}
      </div>
    </Tooltip>
  );
};

export default SmartText;
