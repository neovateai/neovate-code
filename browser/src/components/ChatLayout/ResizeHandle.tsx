import { createStyles } from 'antd-style';
import React, { useCallback, useEffect, useRef } from 'react';
import * as layout from '@/state/layout';

const useResizeHandleStyles = createStyles(({ css }) => ({
  handle: css`
    width: 1px;
    height: 100%;
    background: #e5e5e5;
    cursor: col-resize;
    position: relative;
    transition:
      width 0.2s ease,
      background 0.2s ease;

    &:hover {
      background: #7357ff;
      width: 3px;
    }

    &:active {
      background: #7357ff;
      width: 3px;
    }
  `,
}));

interface ResizeHandleProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  rightPanelRef: React.RefObject<HTMLElement | null>;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
  containerRef,
  rightPanelRef,
}) => {
  const { styles } = useResizeHandleStyles();
  const isDragging = useRef(false);
  const originalTransition = useRef<string>('');

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;

      // Use the passed rightPanelRef
      if (rightPanelRef.current) {
        // Save original transition and disable it for real-time following
        originalTransition.current = rightPanelRef.current.style.transition;
        rightPanelRef.current.style.transition = 'none';
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (
          !isDragging.current ||
          !containerRef.current ||
          !rightPanelRef.current
        )
          return;

        // Get container information
        const containerRect = containerRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width;

        // Calculate mouse relative position
        const mouseX = e.clientX - containerRect.left;

        // Calculate right panel width percentage (calculated from right side)
        const rightWidthPercent =
          ((containerWidth - mouseX) / containerWidth) * 100;

        // Boundary constraints: right panel 20% - 80%
        const minRight = 20;
        const maxRight = 80;
        const clampedRightPercent = Math.max(
          minRight,
          Math.min(maxRight, rightWidthPercent),
        );

        // Directly manipulate DOM styles for real-time following
        rightPanelRef.current.style.width = `${clampedRightPercent}%`;
      };

      const handleMouseUp = () => {
        isDragging.current = false;

        if (rightPanelRef.current) {
          // Read current width directly from DOM styles to avoid precision issues from recalculation
          const currentWidth = rightPanelRef.current.style.width;
          const finalWidthPercent = parseFloat(currentWidth.replace('%', ''));

          // Restore transition effect
          rightPanelRef.current.style.transition = originalTransition.current;

          // Update state to keep it consistent with DOM
          layout.actions.setRightPanelWidthPercent(finalWidthPercent);
        }
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [containerRef, rightPanelRef],
  );

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (rightPanelRef.current && originalTransition.current) {
        rightPanelRef.current.style.transition = originalTransition.current;
      }
    };
  }, [rightPanelRef]);

  return <div className={styles.handle} onMouseDown={handleMouseDown} />;
};

export default ResizeHandle;
