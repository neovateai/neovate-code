import { DownOutlined } from '@ant-design/icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_STYLES, ICON_STYLES, STATUS_CONFIG } from './constants';
import type { MessageWrapperProps } from './types';

// 隐藏滚动条的样式
const scrollableStyle = {
  scrollbarWidth: 'none' as const,
  msOverflowStyle: 'none' as const,
};

const StatusIndicator: React.FC<{
  status: MessageWrapperProps['status'];
  customConfig?: MessageWrapperProps['statusConfig'];
}> = ({ status, customConfig }) => {
  if (!status) return null;

  const defaultConfig = STATUS_CONFIG[status];
  const finalConfig = {
    icon: customConfig?.icon || defaultConfig.icon,
    text: customConfig?.text || defaultConfig.text,
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
  // 状态管理
  const [isExpanded, setIsExpanded] = useState(expanded ?? defaultExpanded);

  // 同步受控状态
  useEffect(() => {
    if (expanded !== undefined) {
      setIsExpanded(expanded);
    }
  }, [expanded]);

  // 检查滚动状态
  const checkScrollState = useCallback(() => {
    if (contentRef.current && isExpanded) {
      const { scrollHeight, clientHeight, scrollTop } = contentRef.current;
      const hasScrollbar = scrollHeight > clientHeight;

      if (hasScrollbar) {
        // 检查是否可以向上滚动（不在顶部）
        const canScrollUp = scrollTop > 1;
        // 检查是否可以向下滚动（不在底部）
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

  // 监听内容变化和展开状态变化
  useEffect(() => {
    checkScrollState();
    // 延迟检查，确保DOM已更新
    const timer = setTimeout(checkScrollState, 100);
    return () => clearTimeout(timer);
  }, [checkScrollState, children, isExpanded]);

  // 处理展开状态变化
  const handleToggleExpand = useCallback(() => {
    // 如果不可展开，直接返回
    if (!expandable) return;

    const newExpanded = !isExpanded;

    // 如果是受控组件，只触发回调
    if (expanded !== undefined) {
      onExpandChange?.(newExpanded);
    } else {
      // 非受控组件，更新内部状态
      setIsExpanded(newExpanded);
      onExpandChange?.(newExpanded);
    }
  }, [isExpanded, expanded, onExpandChange, expandable]);

  // 处理操作按钮点击
  const handleActionClick = useCallback(
    (actionKey: string, actionCallback?: () => void) => {
      return (e: React.MouseEvent) => {
        e.stopPropagation(); // 阻止冒泡到header的点击事件
        actionCallback?.();
        onActionClick?.(actionKey);
      };
    },
    [onActionClick],
  );

  // 渲染图标
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
        {/* Header区域 */}
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
            {/* 图标 */}
            {renderIcon()}

            {/* 标题 */}
            {title && <span className={DEFAULT_STYLES.title}>{title}</span>}

            {/* 状态指示器 */}
            <StatusIndicator status={status} customConfig={statusConfig} />
          </div>

          <div className={DEFAULT_STYLES.headerRight}>
            {/* 右上角操作按钮 */}
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

            {/* 展开箭头 */}
            {showExpandIcon && expandable && (
              <DownOutlined
                className={`${DEFAULT_STYLES.arrow} ${
                  isExpanded ? DEFAULT_STYLES.arrowExpanded : ''
                }`}
              />
            )}
          </div>
        </div>

        {/* Content区域 */}
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
                  {/* 顶部渐变遮罩 - 当启用渐变且可以向上滚动时显示 */}
                  {showGradientMask && canScrollUp && (
                    <div
                      className="absolute top-0 left-0 right-0 h-12 pointer-events-none z-10"
                      style={{
                        background:
                          'linear-gradient(0deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%)',
                      }}
                    />
                  )}

                  {/* 底部渐变遮罩 - 当启用渐变且可以向下滚动时显示 */}
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
          : // 不可展开时，根据defaultExpanded决定是否显示内容
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
                {/* 顶部渐变遮罩 - 当启用渐变且可以向上滚动时显示 */}
                {showGradientMask && canScrollUp && (
                  <div
                    className="absolute top-0 left-0 right-0 h-12 pointer-events-none z-10"
                    style={{
                      background:
                        'linear-gradient(0deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%)',
                    }}
                  />
                )}

                {/* 底部渐变遮罩 - 当启用渐变且可以向下滚动时显示 */}
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
