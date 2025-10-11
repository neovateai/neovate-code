import { createFileRoute } from '@tanstack/react-router';
import { useMount, useRequest } from 'ahooks';
import { message } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { initializeSession } from '@/api/session';
import ChatContent from '@/components/ChatContent';
import ResizeHandle from '@/components/ChatLayout/ResizeHandle';
import RightPanel from '@/components/ChatLayout/RightPanel';
import SidebarExpandButton from '@/components/ChatLayout/SidebarExpandButton';
import TopRightExpandButton from '@/components/ChatLayout/TopRightExpandButton';
import Loading from '@/components/Loading';
import { actions } from '@/state/chat';
import * as layout from '@/state/layout';

const useStyles = createStyles(({ css }) => {
  return {
    container: css`
      display: flex;
      height: 100vh;
      width: 100%;
      overflow: hidden;
    `,

    leftSection: css`
      flex: 1;
      display: flex;
      overflow: hidden;
      min-width: 300px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `,

    rightSection: css`
      flex-shrink: 0;
      transition:
        width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        visibility 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      min-width: 0;
    `,
  };
});

const Chat: React.FC = () => {
  const { styles } = useStyles();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const { rightPanelExpanded, rightPanelWidthPercent } = useSnapshot(
    layout.state,
  );

  // Auto collapse Sidebar when right panel is expanded
  const handleRightPanelExpansion = useCallback(() => {
    if (rightPanelExpanded) {
      layout.actions.setSidebarCollapsed(true);
    }
  }, [rightPanelExpanded]);

  useEffect(() => {
    handleRightPanelExpansion();
  }, [handleRightPanelExpansion]);

  // Only calculate right panel width, left side automatically fills remaining space
  const rightWidth = rightPanelExpanded ? `${rightPanelWidthPercent}%` : '0%';

  return (
    <div ref={containerRef} className={styles.container}>
      <SidebarExpandButton />
      <div className={styles.leftSection}>
        <main className="flex-1 flex flex-col relative">
          <TopRightExpandButton />
          <ChatContent />
        </main>
      </div>

      {rightPanelExpanded && (
        <ResizeHandle
          containerRef={containerRef}
          rightPanelRef={rightPanelRef}
        />
      )}

      <div
        ref={rightPanelRef}
        className={styles.rightSection}
        style={{
          width: rightWidth,
          opacity: rightPanelExpanded ? 1 : 0,
          visibility: rightPanelExpanded ? 'visible' : 'hidden',
        }}
      >
        <RightPanel />
      </div>
    </div>
  );
};

const ChatWrapper: React.FC = () => {
  const { run, loading } = useRequest(
    () =>
      initializeSession({
        // cwd: '/Users/xierenhong/Downloads/test/hello-takumi',
      }),
    {
      manual: true,
      async onSuccess(result) {
        if (result.success) {
          actions.initialize({
            cwd: result.data.cwd,
            sessionId: result.data.sessionId,
            messages: result.data.messages,
          });
        } else {
          console.log('result', result);
          message.error(result.message);
        }
      },
    },
  );

  useMount(() => {
    run();
  });

  if (loading) {
    return <Loading />;
  }

  return <Chat />;
};

export const Route = createFileRoute('/chat')({
  component: ChatWrapper,
});
