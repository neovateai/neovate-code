import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMount, useRequest, useUnmount } from 'ahooks';
import { message } from 'antd';
import { createStyles } from 'antd-style';
import { z } from 'zod';
import { initializeSession } from '@/api/session';
import Loading from '@/components/Loading';
import { actions } from '@/state/chat';
import Chat from './-components/Chat';

const useStyle = createStyles(({ css }) => {
  return {
    container: css`
      display: flex;
      height: 100vh;
      width: 100%;
      align-items: center;
      justify-content: center;
    `,
  };
});

const Session: React.FC = () => {
  const { sessionId, folder } = Route.useSearch();
  const navigate = useNavigate();

  const { run, loading } = useRequest(
    () =>
      initializeSession({
        resume: sessionId,
        cwd: folder,
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

          if (sessionId) {
            navigate({
              to: '/session',
              search: {
                sessionId: result.data.sessionId,
              },
            });
          }
        } else {
          message.error(result.message);
        }
      },
    },
  );
  const { styles } = useStyle();

  useMount(() => {
    run();
  });

  useUnmount(() => {
    actions.destroy();
  });

  if (loading) {
    return (
      <div className={styles.container}>
        <Loading />
      </div>
    );
  }

  return <Chat />;
};

export const Route = createFileRoute('/session/')({
  validateSearch: z.object({
    sessionId: z.string().optional(),
    folder: z.string().optional(),
  }),
  component: Session,
});
