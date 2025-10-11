import '@ant-design/v5-patch-for-react-19';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';
import './global.css';
import './i18n';
import { App } from 'antd';
import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <App>
    <RouterProvider router={router} />
  </App>,
  // </StrictMode>,
);
