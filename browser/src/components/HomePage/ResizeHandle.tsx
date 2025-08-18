import { createStyles } from 'antd-style';
import React, { useCallback, useEffect, useRef } from 'react';
import * as homepage from '@/state/homepage';

const useResizeHandleStyles = createStyles(({ css }) => ({
  handle: css`
    width: 4px;
    height: 100%;
    background: transparent;
    cursor: col-resize;
    position: relative;

    &:hover {
      background: #3370ff;
    }

    &:active {
      background: #3370ff;
    }
  `,
}));

interface ResizeHandleProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ containerRef }) => {
  const { styles } = useResizeHandleStyles();
  const isDragging = useRef(false);
  const rightSectionRef = useRef<HTMLElement | null>(null);
  const originalTransition = useRef<string>('');

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;

      // 获取右侧面板元素
      if (containerRef.current) {
        rightSectionRef.current = containerRef.current.querySelector(
          '[data-right-section]',
        ) as HTMLElement;
        if (rightSectionRef.current) {
          // 保存原始过渡效果并禁用，实现实时跟随
          originalTransition.current = rightSectionRef.current.style.transition;
          rightSectionRef.current.style.transition = 'none';
        }
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (
          !isDragging.current ||
          !containerRef.current ||
          !rightSectionRef.current
        )
          return;

        // 获取容器信息
        const containerRect = containerRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width;

        // 计算鼠标相对位置
        const mouseX = e.clientX - containerRect.left;

        // 计算右侧宽度百分比（从右侧开始计算）
        const rightWidthPercent =
          ((containerWidth - mouseX) / containerWidth) * 100;

        // 边界限制：右侧 20% - 80%
        const minRight = 20;
        const maxRight = 80;
        const clampedRightPercent = Math.max(
          minRight,
          Math.min(maxRight, rightWidthPercent),
        );

        // 直接操作DOM样式，实现实时跟随
        rightSectionRef.current.style.width = `${clampedRightPercent}%`;
      };

      const handleMouseUp = () => {
        isDragging.current = false;

        if (rightSectionRef.current) {
          // 直接从DOM样式读取当前宽度值，避免重新计算带来的精度问题
          const currentWidth = rightSectionRef.current.style.width;
          const finalWidthPercent = parseFloat(currentWidth.replace('%', ''));

          // 恢复过渡效果
          rightSectionRef.current.style.transition = originalTransition.current;

          // 更新状态，保持与DOM完全一致
          homepage.actions.setRightPanelWidthPercent(finalWidthPercent);
        }

        rightSectionRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [containerRef],
  );

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (rightSectionRef.current && originalTransition.current) {
        rightSectionRef.current.style.transition = originalTransition.current;
      }
    };
  }, []);

  return <div className={styles.handle} onMouseDown={handleMouseDown} />;
};

export default ResizeHandle;
