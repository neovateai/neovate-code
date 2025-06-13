import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  model: {},

  proxy: {
    '/api': {
      target: 'http://localhost:1024',
      changeOrigin: true,
    },
    '/ws-chat': {
      target: 'ws://localhost:1024',
      ws: true,
      changeOrigin: true,
    },
  },

  routes: [
    {
      path: '/',
      redirect: '/chat',
    },
    {
      path: '/chat',
      component: '@/pages/Chat',
    },
    // {
    //   path: '/files',
    //   name: '文件管理',
    //   component: '@/pages/Files',
    // },
    // {
    //   path: '/sessions',
    //   name: '会话管理',
    //   component: '@/pages/Sessions',
    // },
    // {
    //   path: '/settings',
    //   name: '设置',
    //   component: '@/pages/Settings',
    // },
  ],

  presets: ['@kmijs/preset-bundler'],
  rspack: {},
  valtio: {},
  title: 'Takumi Browser - AI 编程助手',
});
