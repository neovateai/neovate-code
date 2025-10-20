import {
  createRootRoute,
  Outlet,
  redirect,
  useBlocker,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Modal } from 'antd';
import I18nProvider from '@/components/I18nProvider';

const RootComponent: React.FC = () => {
  useBlocker({
    shouldBlockFn: ({ current, next }) => {
      if (current.fullPath === next.fullPath) {
        return false;
      }
      return new Promise((resolve) => {
        Modal.confirm({
          title: 'Are you sure you want to leave the current workspace?',
          content: 'Unsaved edits will be lost.',
          onOk: () => {
            resolve(false);
          },
          onCancel: () => {
            resolve(true);
          },
        });
      });
    },
    withResolver: true,
  });

  return (
    <I18nProvider>
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </I18nProvider>
  );
};

export const Route = createRootRoute({
  component: RootComponent,
  beforeLoad() {
    if (window.location.pathname === '/') {
      throw redirect({ to: '/session' });
    }
  },
});
