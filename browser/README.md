# Takumi Browser Mode

Takumi Browser 模式提供基于 Web 的用户界面，让您可以通过浏览器与 AI 编程助手进行交互。

## 特性

- 🚀 **实时流式输出**: 支持流式响应，实时查看 AI 的思考过程
- 🤖 **工具调用可视化**: 实时展示每个工具的调用参数、执行状态和结果
- 📁 **文件操作监控**: 可视化文件创建、编辑、删除等操作
- 🔧 **插件生态支持**: 支持插件扩展，自定义界面组件
- 📱 **响应式设计**: 适配桌面和移动设备
- 🌙 **主题支持**: 支持浅色和深色主题

## 快速开始

### 开发环境

```bash
# 进入 browser 目录
cd browser

# 安装依赖
npm install

# 启动开发服务器
npm run dev:full
```

这将同时启动前端开发服务器（端口 8000）和后端 API 服务器（端口 3001）。

### 单独启动

```bash
# 只启动前端
npm run dev

# 只启动后端
npm run dev:server
```

### 生产构建

```bash
# 构建前端资源
npm run build

# 构建后端服务器
npm run build:server

# 启动生产服务器
npm start
```

## 从主项目启动

```bash
# 从 takumi 主项目根目录启动 browser 模式
takumi --browser

# 指定端口和主机
takumi --browser --port 3000 --host localhost

# 带有初始提示
takumi "帮我重构这个项目" --browser

# 指定模型
takumi --browser -m gpt-4o

# 完整示例
takumi "分析项目并生成重构建议" --browser --port 8080 --host 0.0.0.0 -m sonnet-3.5
```

## 项目结构

```
browser/
├── public/                 # 静态资源
├── src/
│   ├── components/         # React 组件
│   │   ├── Chat/          # 聊天相关组件
│   │   ├── Agent/         # Agent 状态组件
│   │   ├── FileExplorer/  # 文件管理组件
│   │   ├── Layout/        # 布局组件
│   │   └── Plugin/        # 插件系统组件
│   ├── server/            # 后端服务器
│   │   ├── routes/        # API 路由
│   │   ├── websocket/     # WebSocket 处理
│   │   └── types.ts       # 服务端类型
│   ├── hooks/             # React Hooks
│   ├── types/             # 类型定义
│   ├── styles/            # 样式文件
│   └── App.tsx            # 应用入口
├── package.json           # 包配置
├── .umirc.ts             # Umi 配置
└── tsconfig.json         # TypeScript 配置
```

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Umi 4.x
- **组件库**: Ant Design 5.x + Ant Design X
- **状态管理**: Zustand
- **样式**: CSS + Ant Design Token
- **路由**: React Router (Umi 内置)

### 后端
- **运行时**: Node.js
- **框架**: Connect + Express
- **WebSocket**: ws
- **类型系统**: TypeScript

## API 接口

### REST API

- `GET /api/health` - 健康检查
- `GET /api/sessions` - 获取会话列表
- `POST /api/sessions` - 创建新会话
- `POST /api/chat` - 发送聊天消息
- `GET /api/files` - 获取文件列表
- `POST /api/files` - 文件操作
- `GET /api/project` - 获取项目信息
- `GET /api/config` - 获取配置
- `POST /api/config` - 更新配置
- `GET /api/models` - 获取可用模型
- `GET /api/agents` - 获取 Agent 信息
- `GET /api/tasks` - 获取任务列表

### WebSocket 消息类型

- `chat` - 聊天消息（支持流式输出）
- `action` - Agent 动作消息
- `event` - 系统事件消息
- `file_op` - 文件操作消息
- `task_status` - 任务状态消息
- `session_info` - 会话信息消息

## 插件开发

Browser 模式支持插件扩展，可以添加自定义界面组件。

### 插件接口

```typescript
interface BrowserPlugin {
  // 标准插件钩子
  queryStart?: (args: any) => void;
  toolEnd?: (args: any) => void;
  
  // Browser 专有钩子
  browserUIComponents?: () => {
    panels?: Array<{
      id: string;
      title: string;
      resourceUrl: string; // CDN 或本地路径
      placement: 'sidebar' | 'main' | 'footer';
      props?: Record<string, any>;
    }>;
    messageRenderers?: Array<{
      type: string;
      resourceUrl: string;
    }>;
    globalCSS?: string[];
    globalJS?: string[];
  };
}
```

### 插件组件示例

```javascript
// 插件组件 (UMD 格式)
(function (global, factory) {
  // UMD 包装
})(this, function (exports, React) {
  const MyPluginPanel = ({ sessionId, sendMessage }) => {
    return React.createElement('div', {}, '我的插件面板');
  };
  
  exports.default = MyPluginPanel;
});
```

## 配置

### 环境变量

- `NODE_ENV` - 环境模式 (development/production)
- `API_BASE_URL` - API 基础 URL
- `WS_URL` - WebSocket URL

### Umi 配置

参见 `.umirc.ts` 文件，支持：
- 代理配置
- 主题定制
- 路由配置
- 构建优化

## 开发指南

### 添加新组件

1. 在 `src/components/` 下创建组件目录
2. 实现组件逻辑
3. 添加类型定义
4. 更新路由配置（如需要）

### 添加新 API

1. 在 `src/server/routes/` 下添加路由处理器
2. 更新 `src/server/routes/index.ts`
3. 添加类型定义
4. 更新前端 API 调用

### WebSocket 消息处理

1. 在 `src/server/websocket/handler.ts` 中添加消息类型
2. 实现前端消息处理逻辑
3. 更新类型定义

## 部署

### Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY public/ ./public/

EXPOSE 3001
CMD ["npm", "start"]
```

### 传统部署

1. 构建项目: `npm run build && npm run build:server`
2. 上传 `dist/`、`public/` 和 `package.json`
3. 安装依赖: `npm ci --only=production`
4. 启动服务: `npm start`

## 故障排除

### 常见问题

1. **WebSocket 连接失败**
   - 检查防火墙设置
   - 确认后端服务器已启动
   - 检查代理配置

2. **前端资源加载失败**
   - 检查静态资源路径
   - 确认构建产物完整

3. **API 请求失败**
   - 检查 CORS 配置
   - 确认 API 服务器可访问

### 调试模式

启动时添加调试参数：

```bash
DEBUG=takumi:* npm run dev:server
```
