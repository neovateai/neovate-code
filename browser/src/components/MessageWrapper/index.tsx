import { Button } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExpandArrowIcon from '@/icons/expand-arrow.svg?react';
import { STATUS_CONFIG } from './constants';
import styles from './index.module.css';
import type { MessageWrapperProps } from './types';

const StatusIndicator: React.FC<{
  status: MessageWrapperProps['status'];
  statusIcon?: React.ReactNode;
  statusText?: string;
  statusClassName?: string;
}> = ({ status, statusIcon, statusText, statusClassName }) => {
  const { t } = useTranslation();

  if (!status) return null;

  const defaultConfig = STATUS_CONFIG[status];

  const finalConfig = {
    icon: statusIcon || defaultConfig.icon,
    text: statusText || t(defaultConfig.text),
    className: statusClassName || defaultConfig.className,
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
  statusIcon,
  statusText,
  statusClassName,
  defaultExpanded = true,
  expanded,
  onExpandChange,
  showExpandIcon = true,
  expandable = true,
  maxHeight = 220,
  showGradientMask = true,
  actions = [],
  onActionClick,
  footers = [],
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
        } ${!isExpanded ? styles.headerCollapsed : ''}`}
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
          <StatusIndicator
            status={status}
            statusIcon={statusIcon}
            statusText={statusText}
            statusClassName={statusClassName}
          />
        </div>

        <div className={styles.headerRight}>
          {/* Top right action buttons */}
          {actions && actions.length > 0 && (
            <div
              className={`${styles.actionButtonGroup} ${showExpandIcon && expandable ? styles.actionButtonGroupWithExpandIcon : ''}`}
            >
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
            <ExpandArrowIcon
              className={`${styles.expandIcon} ${isExpanded ? styles.arrowExpanded : ''}`}
            />
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

      {/* Bottom action buttons */}
      {footers && footers.length > 0 && (
        <div className={styles.footerContainer}>
          {footers.map((footer) => (
            <Button
              key={footer.key}
              variant="outlined"
              className={styles.footerButton}
              onClick={footer.onClick}
              color={footer.color}
              icon={footer.icon}
            >
              {footer.text}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageWrapper;
export * from './types';
