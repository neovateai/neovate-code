import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      routesDirectory: path.resolve(__dirname, './src/pages'),
      indexToken: 'index',
      routeToken: 'route',
      routeTreeFileHeader: [
        '/* prettier-ignore-start */',
        '/* eslint-disable */',
        '// @ts-nocheck',
        '// noinspection JSUnusedGlobalSymbols',
      ],
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    svgr(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../dist/browser',
  },
  server: {
    host: '0.0.0.0',
    port: 8000,
    proxy: {
      '/api': {
        target: 'http://localhost:1024',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:1024',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
