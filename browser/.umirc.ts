import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  model: {},

  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      pathRewrite: { '^/api': '/api' },
    },
    '/ws': {
      target: 'ws://localhost:3001',
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
      name: '对话',
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

  // 路由配置
  title: 'Takumi Browser - AI 编程助手',
});
