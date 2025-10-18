import { createFileRoute } from '@tanstack/react-router';
import { useMount, useUnmount } from 'ahooks';
import { createStyles } from 'antd-style';
import { z } from 'zod';
import Loading from '@/components/Loading';
import { useSession } from '@/hooks/useSession';
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
  const { run, loading } = useSession();

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
    sessionId: z.union([z.string(), z.number()]).optional(),
    folder: z.string().optional(),
  }),
  component: Session,
});
