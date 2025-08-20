import { DownOutlined } from '@ant-design/icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_STYLES, ICON_STYLES, STATUS_CONFIG } from './constants';
import type { MessageWrapperProps } from './types';

// Hide scrollbar styles
const scrollableStyle = {
  scrollbarWidth: 'none' as const,
  msOverflowStyle: 'none' as const,
};

const StatusIndicator: React.FC<{
  status: MessageWrapperProps['status'];
  customConfig?: MessageWrapperProps['statusConfig'];
}> = ({ status, customConfig }) => {
  const { t } = useTranslation();

  if (!status) return null;

  const defaultConfig = STATUS_CONFIG[status];

  const finalConfig = {
    icon: customConfig?.icon || defaultConfig.icon,
    text: customConfig?.text || t(defaultConfig.text),
    className: customConfig?.className || defaultConfig.className,
  };

  return (
    <div
      className={`${DEFAULT_STYLES.statusContainer} ${finalConfig.className}`}
    >
      <div className={DEFAULT_STYLES.statusIcon}>{finalConfig.icon}</div>
      <span className={DEFAULT_STYLES.statusText}>{finalConfig.text}</span>
    </div>
  );
};

const MessageWrapper: React.FC<MessageWrapperProps> = ({
  children,
  className = '',
  title,
  icon,
  status,
  defaultExpanded = true,
  expanded,
  onExpandChange,
  showExpandIcon = true,
  expandable = true,
  maxHeight = 220,
  showGradientMask = true,
  statusConfig,
  actions = [],
  onActionClick,
}) => {
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  // State management
  const [isExpanded, setIsExpanded] = useState(expanded ?? defaultExpanded);

  // Sync controlled state
  useEffect(() => {
    if (expanded !== undefined) {
      setIsExpanded(expanded);
    }
  }, [expanded]);

  // Check scroll state
  const checkScrollState = useCallback(() => {
    if (contentRef.current && isExpanded) {
      const { scrollHeight, clientHeight, scrollTop } = contentRef.current;
      const hasScrollbar = scrollHeight > clientHeight;

      if (hasScrollbar) {
        // Check if can scroll up (not at top)
        const canScrollUp = scrollTop > 1;
        // Check if can scroll down (not at bottom)
        const canScrollDown =
          Math.abs(scrollHeight - clientHeight - scrollTop) > 1;

        setCanScrollUp(canScrollUp);
        setCanScrollDown(canScrollDown);
      } else {
        setCanScrollUp(false);
        setCanScrollDown(false);
      }
    } else {
      setCanScrollUp(false);
      setCanScrollDown(false);
    }
  }, [isExpanded]);

  // Listen for content changes and expand state changes
  useEffect(() => {
    checkScrollState();
    // Delayed check to ensure DOM is updated
    const timer = setTimeout(checkScrollState, 100);
    return () => clearTimeout(timer);
  }, [checkScrollState, children, isExpanded]);

  // Handle expand state change
  const handleToggleExpand = useCallback(() => {
    // If not expandable, return directly
    if (!expandable) return;

    const newExpanded = !isExpanded;

    // If controlled component, only trigger callback
    if (expanded !== undefined) {
      onExpandChange?.(newExpanded);
    } else {
      // Uncontrolled component, update internal state
      setIsExpanded(newExpanded);
      onExpandChange?.(newExpanded);
    }
  }, [isExpanded, expanded, onExpandChange, expandable]);

  // Handle action button click
  const handleActionClick = useCallback(
    (actionKey: string, actionCallback?: () => void) => {
      return (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling to header click event
        actionCallback?.();
        onActionClick?.(actionKey);
      };
    },
    [onActionClick],
  );

  // Render icon
  const renderIcon = () => {
    if (!icon) return null;

    return (
      <div className={`${ICON_STYLES.base} ${DEFAULT_STYLES.icon}`}>{icon}</div>
    );
  };

  return (
    <>
      <style>
        {`
          .message-wrapper-scrollable::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <div className={`${DEFAULT_STYLES.container} ${className}`}>
        {/* Header area */}
        <div
          className={`${DEFAULT_STYLES.header} ${expandable ? 'cursor-pointer' : 'cursor-default'}`}
          onClick={expandable ? handleToggleExpand : undefined}
          role={expandable ? 'button' : undefined}
          tabIndex={expandable ? 0 : undefined}
          onKeyDown={
            expandable
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleExpand();
                  }
                }
              : undefined
          }
        >
          <div className={DEFAULT_STYLES.headerLeft}>
            {/* Icon */}
            {renderIcon()}

            {/* Title */}
            {title && <span className={DEFAULT_STYLES.title}>{title}</span>}

            {/* Status indicator */}
            <StatusIndicator status={status} customConfig={statusConfig} />
          </div>

          <div className={DEFAULT_STYLES.headerRight}>
            {/* Top right action buttons */}
            {actions && actions.length > 0 && (
              <div className="flex items-center gap-1 mr-2">
                {actions.map((action) => (
                  <button
                    key={action.key}
                    className={DEFAULT_STYLES.actionButton}
                    onClick={handleActionClick(action.key, action.onClick)}
                    type="button"
                  >
                    {action.icon}
                  </button>
                ))}
              </div>
            )}

            {/* Expand arrow */}
            {showExpandIcon && expandable && (
              <DownOutlined
                className={`${DEFAULT_STYLES.arrow} ${
                  isExpanded ? DEFAULT_STYLES.arrowExpanded : ''
                }`}
              />
            )}
          </div>
        </div>

        {/* Content area */}
        {expandable
          ? isExpanded && (
              <div className={DEFAULT_STYLES.content}>
                <div className="relative">
                  <div
                    ref={contentRef}
                    className={`${DEFAULT_STYLES.contentInner} ${DEFAULT_STYLES.scrollable} message-wrapper-scrollable`}
                    style={{
                      maxHeight:
                        typeof maxHeight === 'number'
                          ? `${maxHeight}px`
                          : maxHeight,
                      ...scrollableStyle,
                    }}
                    onScroll={checkScrollState}
                  >
                    {children}
                  </div>
                  {/* Top gradient mask - show when gradient is enabled and can scroll up */}
                  {showGradientMask && canScrollUp && (
                    <div
                      className="absolute top-0 left-0 right-0 h-12 pointer-events-none z-10"
                      style={{
                        background:
                          'linear-gradient(0deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%)',
                      }}
                    />
                  )}

                  {/* Bottom gradient mask - show when gradient is enabled and can scroll down */}
                  {showGradientMask && canScrollDown && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none z-10"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%)',
                      }}
                    />
                  )}
                </div>
              </div>
            )
          : // When not expandable, show content based on defaultExpanded
            isExpanded && (
              <div className="relative">
                <div
                  ref={expandable ? undefined : contentRef}
                  className={`${DEFAULT_STYLES.contentInner} ${DEFAULT_STYLES.scrollable} message-wrapper-scrollable`}
                  style={{
                    maxHeight:
                      typeof maxHeight === 'number'
                        ? `${maxHeight}px`
                        : maxHeight,
                    ...scrollableStyle,
                  }}
                  onScroll={expandable ? undefined : checkScrollState}
                >
                  {children}
                </div>
                {/* Top gradient mask - show when gradient is enabled and can scroll up */}
                {showGradientMask && canScrollUp && (
                  <div
                    className="absolute top-0 left-0 right-0 h-12 pointer-events-none z-10"
                    style={{
                      background:
                        'linear-gradient(0deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%)',
                    }}
                  />
                )}

                {/* Bottom gradient mask - show when gradient is enabled and can scroll down */}
                {showGradientMask && canScrollDown && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none z-10"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%)',
                    }}
                  />
                )}
              </div>
            )}
      </div>
    </>
  );
};

export default MessageWrapper;
export * from './types';
export { MessageWrapperStatus } from './types';
