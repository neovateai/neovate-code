import { Outlet, createRootRoute, redirect } from '@tanstack/react-router';
import I18nProvider from '@/components/I18nProvider';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

const RootComponent: React.FC = () => {
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
