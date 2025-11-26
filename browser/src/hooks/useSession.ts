import { useSearch } from '@tanstack/react-router';
import { useRequest } from 'ahooks';
import { message } from 'antd';
import { initializeSession } from '@/api/session';
import { actions } from '@/state/chat';

export const useSession = () => {
  const { sessionId, folder } = useSearch({ from: '/session/' });

  const { run: runSession, loading } = useRequest(
    (options: { resume?: string; cwd?: string }) =>
      initializeSession({
        resume: options.resume,
        cwd: options.cwd,
      }),
    {
      manual: true,
      onSuccess: (result, [params]) => {
        if (result.success) {
          actions.initialize({
            cwd: result.data.cwd,
            sessionId: result.data.sessionId,
            messages: result.data.messages,
          });

          if (!params.resume) {
            // navigate({
            //   to: '/session',
            //   search: {
            //     sessionId: result.data.sessionId,
            //     folder: result.data.cwd,
            //   },
            // });
            window.location.href = `/session?sessionId=${result.data.sessionId}&folder=${result.data.cwd}`;
          }
        } else {
          message.error(result.message);
        }
      },
    },
  );

  const run = () =>
    runSession({
      resume: sessionId ? String(sessionId) : undefined,
      cwd: folder,
    });

  const newSession = () => runSession({ cwd: folder });

  return {
    run,
    loading,
    newSession,
  };
};
