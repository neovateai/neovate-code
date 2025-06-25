import { loader } from '@monaco-editor/react';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import * as monaco from 'monaco-editor';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './global.css';
import './i18n';
import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree });

loader.config({
  monaco: monaco,
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
