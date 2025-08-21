import { DownOutlined } from '@ant-design/icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { STATUS_CONFIG } from './constants';
import styles from './index.module.css';
import type { MessageWrapperProps } from './types';

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
    <div className={`${styles.statusContainer} ${finalConfig.className}`}>
      <div className={styles.statusIcon}>{finalConfig.icon}</div>
      <span className={styles.statusText}>{finalConfig.text}</span>
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

    return <div className={styles.icon}>{icon}</div>;
  };

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Header area */}
      <div
        className={`${styles.header} ${
          expandable ? styles.headerExpandable : styles.headerNotExpandable
        }`}
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
        <div className={styles.headerLeft}>
          {/* Icon */}
          {renderIcon()}

          {/* Title */}
          {title && <span className={styles.title}>{title}</span>}

          {/* Status indicator */}
          <StatusIndicator status={status} customConfig={statusConfig} />
        </div>

        <div className={styles.headerRight}>
          {/* Top right action buttons */}
          {actions && actions.length > 0 && (
            <div className={styles.actionButtonGroup}>
              {actions.map((action) => (
                <button
                  key={action.key}
                  className={styles.actionButton}
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
            <svg
              width="13"
              height="8"
              viewBox="0 0 13 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`${isExpanded ? styles.arrowExpanded : ''}`}
            >
              <path
                d="M0.694962 0.704741C0.435013 0.977729 0.435013 1.42033 0.694962 1.69332L6.02932 7.29526C6.28927 7.56825 6.71073 7.56825 6.97068 7.29526L12.305 1.69332C12.565 1.42033 12.565 0.977729 12.305 0.704741C12.0451 0.431753 11.6236 0.431753 11.3637 0.704741L6.5 5.81239L1.63632 0.704741C1.37637 0.431753 0.95491 0.431753 0.694962 0.704741Z"
                fill="#666F8D"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content area */}
      {expandable
        ? isExpanded && (
            <div className={styles.content}>
              <div className={styles.contentWrapper}>
                <div
                  ref={contentRef}
                  className={`${styles.contentInner} ${styles.scrollable}`}
                  style={{
                    maxHeight:
                      typeof maxHeight === 'number'
                        ? `${maxHeight}px`
                        : maxHeight,
                  }}
                  onScroll={checkScrollState}
                >
                  {children}
                </div>
                {/* Top gradient mask - show when gradient is enabled and can scroll up */}
                {showGradientMask && canScrollUp && (
                  <div className={styles.gradientMaskTop} />
                )}

                {/* Bottom gradient mask - show when gradient is enabled and can scroll down */}
                {showGradientMask && canScrollDown && (
                  <div className={styles.gradientMaskBottom} />
                )}
              </div>
            </div>
          )
        : // When not expandable, show content based on defaultExpanded
          isExpanded && (
            <div className={styles.contentWrapper}>
              <div
                ref={expandable ? undefined : contentRef}
                className={`${styles.contentInner} ${styles.scrollable}`}
                style={{
                  maxHeight:
                    typeof maxHeight === 'number'
                      ? `${maxHeight}px`
                      : maxHeight,
                }}
                onScroll={expandable ? undefined : checkScrollState}
              >
                {children}
              </div>
              {/* Top gradient mask - show when gradient is enabled and can scroll up */}
              {showGradientMask && canScrollUp && (
                <div className={styles.gradientMaskTop} />
              )}

              {/* Bottom gradient mask - show when gradient is enabled and can scroll down */}
              {showGradientMask && canScrollDown && (
                <div className={styles.gradientMaskBottom} />
              )}
            </div>
          )}
    </div>
  );
};

export default MessageWrapper;
export * from './types';
export { MessageWrapperStatus } from './types';
