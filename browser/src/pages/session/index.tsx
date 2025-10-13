import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMount, useRequest } from 'ahooks';
import { message } from 'antd';
import { z } from 'zod';
import { initializeSession } from '@/api/session';
import Loading from '@/components/Loading';
import { actions } from '@/state/chat';
import Chat from './-components/Chat';

const Session: React.FC = () => {
  const { sessionId } = Route.useSearch();
  const navigate = useNavigate();

  const { run, loading } = useRequest(
    () =>
      initializeSession({
        resume: sessionId,
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

  useMount(() => {
    run();
  });

  if (loading) {
    return <Loading />;
  }

  return <Chat />;
};

export const Route = createFileRoute('/session/')({
  validateSearch: z.object({
    sessionId: z.string().optional(),
  }),
  component: Session,
});
