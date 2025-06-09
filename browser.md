# Takumi Browser 模式实施计划

## 概述

为 Takumi 项目增加 browser 模式，提供基于 Web 的用户界面，深度参考 [OpenHands](https://github.com/All-Hands-AI/OpenHands) 的架构设计。通过浏览器界面与 AI 编程助手进行交互，支持实时流式输出和代理式对话体验，使用 antd 和 ant-design-x 作为基础组件库。

## 技术架构（参考 OpenHands）

### 后端服务架构
1. **HTTP 服务器**: 基于 connect/express，提供 RESTful API
2. **Agent 系统**: 参考 OpenHands 的 Agent 架构，实现任务执行和状态管理
3. **WebSocket 服务**: 
   - 实时双向通信和流式输出
   - 事件驱动的消息系统
   - 支持多种消息类型（对话、文件操作、系统事件等）
4. **参数启动方式**: 通过 `--browser` 参数启动 browser 服务
5. **插件集成**: 利用 takumi 现有的插件系统暴露 Web API
6. **会话管理**: 支持多个并发会话和状态持久化

### 前端架构
1. **框架**: React 18 + TypeScript + Umi 4.x
2. **构建工具**: Kmi (基于 Rspack，提供更快的构建速度)
3. **组件库**: Ant Design 5.x + Ant Design X
4. **状态管理**: Umi 内置状态管理 或 Zustand
5. **样式方案**: UnoCSS + Ant Design Token

### 新架构优势
1. **独立开发**: `browser/` 作为独立 npm 包，可独立开发、测试和部署
2. **前后端统一**: 前端和后端代码都在 `browser/` 目录中，便于管理和维护
3. **清晰分离**: 主项目只负责插件集成，browser 模式功能完全独立
4. **组件化开发**: 详细的组件目录结构，便于团队协作开发
5. **灵活部署**: 可作为独立 Web 应用部署，也可嵌入到主项目中

### 通信协议（参考 OpenHands 设计）
1. **HTTP API**: RESTful API 处理基础操作
2. **WebSocket**: 实时消息传递和流式输出
3. **消息格式**: 基于事件的消息系统，支持多种消息类型
4. **Agent 通信**: 任务执行、状态更新、结果反馈的完整生命周期管理

## 实施阶段

### 第一阶段：基础架构搭建

#### 1.1 Browser 项目架构搭建（独立 npm 包）
- [ ] 创建 `browser/` 根目录作为独立项目
- [ ] 初始化 `browser/package.json` 独立包配置
- [ ] 使用 Kmi 脚手架创建 Umi + Rspack 项目
```bash
cd browser
npm init @kmijs/kmi@latest takumi-browser
```
- [ ] 配置 `.umirc.ts` 集成 Kmi preset 和 UnoCSS
- [ ] 集成 Ant Design 5.x 和 Ant Design X
- [ ] 创建完整的组件目录结构
  - [ ] `src/components/Chat/` - 聊天相关组件
  - [ ] `src/components/FileExplorer/` - 文件管理组件  
  - [ ] `src/components/ConfigPanel/` - 配置面板组件
  - [ ] `src/components/Layout/` - 布局组件
  - [ ] `src/components/Common/` - 通用组件

#### 1.2 后端服务基础（集成在 browser/ 中）
- [ ] 创建 `browser/src/server/` 目录结构
- [ ] 实现基础 HTTP 服务器 (`browser/src/server/app.ts`)
- [ ] 添加 WebSocket 支持 (`browser/src/server/websocket/handler.ts`)
- [ ] 创建路由系统 (`browser/src/server/routes/`)
- [ ] 实现中间件系统 (`browser/src/server/middleware/`)
- [ ] 创建业务逻辑服务 (`browser/src/server/services/`)

#### 1.3 CLI 参数扩展
- [ ] 修改 `src/index.ts` 中的 `yargsParser` 配置，添加 `browser` 参数支持
- [ ] 在参数解析后检测 `--browser` 参数
- [ ] 修改默认命令逻辑，如果检测到 `--browser` 参数则启动 browser 模式
- [ ] 创建 browser 启动逻辑，集成前端构建产物服务

### 第二阶段：核心功能实现 

#### 2.1 WebSocket 通信协议（基于 OpenHands 设计）
```typescript
// 基础消息接口
interface BaseMessage {
  id: string;
  timestamp: number;
  type: string;
  source?: 'user' | 'agent' | 'system';
}

// 聊天消息（支持流式输出）
interface ChatMessage extends BaseMessage {
  type: 'chat';
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  delta?: string; // 流式输出的增量内容
  finished?: boolean;
}

// Agent 动作消息
interface AgentAction extends BaseMessage {
  type: 'action';
  action: 'read_file' | 'write_file' | 'run_command' | 'browse_web' | 'search_code';
  args: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

// 系统事件消息
interface SystemEvent extends BaseMessage {
  type: 'event';
  event: 'file_changed' | 'project_loaded' | 'agent_started' | 'agent_stopped' | 'error';
  data: any;
}

// 文件操作消息
interface FileOperation extends BaseMessage {
  type: 'file_op';
  operation: 'create' | 'update' | 'delete' | 'move' | 'copy';
  path: string;
  content?: string;
  oldPath?: string;
  diff?: string;
}

// 任务状态消息
interface TaskStatus extends BaseMessage {
  type: 'task_status';
  taskId: string;
  status: 'created' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  description?: string;
  result?: any;
  error?: string;
}

// 联合消息类型
type WebSocketMessage = ChatMessage | AgentAction | SystemEvent | FileOperation | TaskStatus;

// 消息处理器接口
interface MessageHandler {
  onChatMessage(message: ChatMessage): void;
  onAgentAction(message: AgentAction): void;
  onSystemEvent(message: SystemEvent): void;
  onFileOperation(message: FileOperation): void;
  onTaskStatus(message: TaskStatus): void;
}
```

#### 2.2 后端 API 设计（参考 OpenHands）
- [ ] `/api/chat` - 聊天消息处理和流式响应
- [ ] `/api/agents` - Agent 管理和任务执行
- [ ] `/api/files` - 文件操作 API (CRUD, diff, search)
- [ ] `/api/project` - 项目信息和 Git 状态
- [ ] `/api/sessions` - 会话管理 (创建、恢复、删除)
- [ ] `/api/config` - 配置管理 API
- [ ] `/api/tasks` - 任务管理和状态跟踪
- [ ] WebSocket `/ws` - 实时通信和事件推送
- [ ] `/api/health` - 服务健康检查
- [ ] `/api/models` - 可用模型列表和配置

#### 2.3 前端核心组件（基于 OpenHands 体验设计）
- [ ] `browser/src/components/Chat/ChatInterface.tsx` - 主聊天界面，支持流式输出
- [ ] `browser/src/components/Chat/StreamingMessage.tsx` - 流式文本显示组件
- [ ] `browser/src/components/Chat/MessageRenderer.tsx` - 消息渲染器（Markdown、代码高亮）
- [ ] `browser/src/components/Agent/AgentStatus.tsx` - Agent 状态显示
- [ ] `browser/src/components/Agent/TaskProgress.tsx` - 任务进度指示器
- [ ] `browser/src/components/FileExplorer/FileTree.tsx` - 文件浏览器
- [ ] `browser/src/components/FileExplorer/FileDiff.tsx` - 文件差异对比
- [ ] `browser/src/components/Terminal/TerminalOutput.tsx` - 终端输出显示
- [ ] `browser/src/components/ConfigPanel/SettingsPanel.tsx` - 配置面板
- [ ] `browser/src/components/Layout/StatusBar.tsx` - 状态栏（显示 Agent 状态）
- [ ] `browser/src/components/Layout/MainLayout.tsx` - 主布局组件
- [ ] `browser/src/components/Session/SessionManager.tsx` - 会话管理器
- [ ] 实现对应的 hooks (`browser/src/hooks/`)
  - [ ] `useWebSocket.ts` - WebSocket 连接管理
  - [ ] `useStreaming.ts` - 流式输出处理
  - [ ] `useAgent.ts` - Agent 状态管理
- [ ] 创建状态管理 (`browser/src/stores/`)
  - [ ] 使用 Zustand 进行状态管理，支持持久化

### 第三阶段：架构复用和插件集成

#### 3.1 复用现有 LLM Query 架构
- [ ] 在 Browser 模式中直接复用 `src/llms/query.ts` 的完整逻辑
- [ ] 通过插件钩子系统暴露执行过程到 Web 界面
- [ ] 保持 CLI 和 Web 模式的查询逻辑完全一致
- [ ] 复用现有的工具调用、流式输出、上下文管理等机制

#### 3.2 Browser 插件系统集成
- [ ] 创建 browser 插件 (`src/plugins/browser.ts`)，监听所有相关钩子
- [ ] 实现事件转发机制，将插件钩子事件推送到 WebSocket
- [ ] 集成现有工具系统 (getAllTools, getAskTools)
- [ ] 暴露 MCP 服务到 Web 界面
- [ ] 实现 plan 模式的 Web 展示
- [ ] 在 `browser/src/services/` 中实现 Agent 执行过程可视化

#### 3.3 插件扩展 Browser 模式支持
- [ ] 扩展插件接口，支持 Browser 模式专有钩子
- [ ] 实现插件自定义 WebSocket 消息类型
- [ ] 支持插件注册自定义前端组件
- [ ] 提供插件与前端的双向通信机制
- [ ] 确保第三方插件在 CLI 和 Browser 模式下逻辑一致

#### 3.4 流式输出优化（基于现有实现）
- [ ] 复用现有的流式文本渲染逻辑 (`context.config.stream`)
- [ ] 集成现有的 Markdown 渲染器 (`utils/markdown.ts`)
- [ ] 保持与 CLI 模式一致的代码高亮和语法识别
- [ ] 实现工具调用进度的可视化展示

#### 3.5 用户体验优化
- [ ] 响应式布局适配
- [ ] 快捷键支持
- [ ] 主题切换 (深色/浅色模式)
- [ ] 会话历史管理
- [ ] 工具调用详情展示和交互
- [ ] 插件自定义界面组件的动态加载和渲染

### 第四阶段：功能完善 

#### 4.1 文件操作界面
- [ ] 文件树展示和操作
- [ ] 文件内容预览和编辑
- [ ] 差异对比 (diff) 显示
- [ ] 批量文件操作

#### 4.2 项目管理
- [ ] Git 状态展示
- [ ] 分支切换
- [ ] 提交历史查看
- [ ] 配置文件管理

#### 4.3 错误处理和日志
- [ ] 错误边界处理
- [ ] 日志记录和展示
- [ ] 调试模式支持

## 目录结构规划

```
browser/                        # Browser 模式完整目录（独立npm包）
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/             # 前端 React 组件
│   │   ├── Chat/
│   │   │   ├── ChatInterface.tsx        # 主聊天界面
│   │   │   ├── MessageList.tsx          # 消息列表容器
│   │   │   ├── MessageInput.tsx         # 消息输入框
│   │   │   ├── StreamingMessage.tsx     # 流式消息显示
│   │   │   └── MessageRenderer.tsx      # 消息渲染器
│   │   ├── Agent/                       # Agent 相关组件
│   │   │   ├── AgentStatus.tsx          # Agent 状态显示
│   │   │   ├── TaskProgress.tsx         # 任务进度条
│   │   │   ├── ActionPanel.tsx          # 动作面板
│   │   │   └── AgentSelector.tsx        # Agent 选择器
│   │   ├── FileExplorer/
│   │   │   ├── FileTree.tsx             # 文件树
│   │   │   ├── FileViewer.tsx           # 文件查看器
│   │   │   ├── DiffViewer.tsx           # 差异对比
│   │   │   └── FileSearch.tsx           # 文件搜索
│   │   ├── Terminal/                    # 终端相关组件
│   │   │   ├── TerminalOutput.tsx       # 终端输出
│   │   │   ├── CommandHistory.tsx       # 命令历史
│   │   │   └── TerminalInput.tsx        # 终端输入
│   │   ├── ConfigPanel/
│   │   │   ├── SettingsPanel.tsx        # 设置面板
│   │   │   ├── ModelConfig.tsx          # 模型配置
│   │   │   └── SessionConfig.tsx        # 会话配置
│   │   ├── Layout/
│   │   │   ├── MainLayout.tsx           # 主布局
│   │   │   ├── Sidebar.tsx              # 侧边栏
│   │   │   ├── StatusBar.tsx            # 状态栏
│   │   │   └── Header.tsx               # 头部导航
│   │   ├── Session/                     # 会话管理
│   │   │   ├── SessionManager.tsx       # 会话管理器
│   │   │   ├── SessionList.tsx          # 会话列表
│   │   │   └── SessionCard.tsx          # 会话卡片
│   │   ├── Plugin/                      # 插件系统组件
│   │   │   ├── StaticResourceLoader.tsx # 静态资源加载器
│   │   │   ├── PluginPanelManager.tsx   # 插件面板管理
│   │   │   ├── PluginMessageRenderer.tsx# 插件消息渲染器
│   │   │   └── PluginToolActions.tsx    # 插件工具操作
│   │   └── Common/
│   │       ├── Loading.tsx              # 加载指示器
│   │       ├── ErrorBoundary.tsx        # 错误边界
│   │       └── WebSocketStatus.tsx      # WebSocket 状态
│   ├── server/                 # 后端服务代码
│   │   ├── routes/             # API 路由
│   │   │   ├── chat.ts
│   │   │   ├── files.ts
│   │   │   ├── project.ts
│   │   │   └── index.ts
│   │   ├── middleware/         # 中间件
│   │   │   ├── cors.ts
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── services/           # 业务逻辑服务
│   │   │   ├── chatService.ts
│   │   │   ├── fileService.ts
│   │   │   └── projectService.ts
│   │   ├── websocket/          # WebSocket 处理
│   │   │   ├── handler.ts
│   │   │   ├── messages.ts
│   │   │   └── plugin-manager.ts       # 插件管理器
│   │   ├── app.ts              # 服务器入口
│   │   └── types.ts            # 服务端类型定义
│   ├── hooks/                  # 自定义 React Hooks
│   │   ├── useWebSocket.ts         # WebSocket 连接管理
│   │   ├── useChat.ts              # 聊天状态管理
│   │   ├── useStreaming.ts         # 流式输出处理
│   │   ├── useAgent.ts             # Agent 状态管理
│   │   ├── useFileSystem.ts        # 文件系统操作
│   │   ├── useSession.ts           # 会话管理
│   │   └── useTask.ts              # 任务状态管理
│   ├── services/               # 前端 API 服务
│   │   ├── api.ts
│   │   ├── websocket.ts
│   │   └── fileApi.ts
│   ├── stores/                 # 状态管理
│   │   ├── chatStore.ts
│   │   ├── fileStore.ts
│   │   └── configStore.ts
│   ├── types/                  # TypeScript 类型定义
│   │   ├── chat.ts
│   │   ├── file.ts
│   │   └── common.ts
│   ├── utils/                  # 工具函数
│   │   ├── formatters.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── styles/                 # 样式文件
│   │   ├── global.css
│   │   └── variables.css
│   ├── App.tsx                 # 前端应用入口
│   └── main.tsx                # 主入口文件
├── package.json                # 独立包配置
├── .umirc.ts                   # Umi + Kmi 配置
├── tsconfig.json               # TypeScript 配置
├── uno.config.ts               # UnoCSS 配置
└── README.md                   # Browser 模式文档

src/                            # 主项目 src 目录
├── commands/
│   └── browser.ts              # browser 相关逻辑（如果需要）
└── plugins/
    └── browser.ts              # browser 插件集成
```

## 核心技术实现（架构复用优先）

### 1. CLI 参数解析修改（保持现有架构）

```typescript
// src/index.ts 中的修改
export async function runCli(opts: RunCliOpts) {
  // ... 现有代码 ...
  
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      m: 'model',
      v: 'version',
      q: 'quiet',
      h: 'help',
      i: 'interactive',
      a: 'approvalMode',
      e: 'edit-mode',
    },
    array: ['plugin', 'apiKey'],
    boolean: ['plan', 'stream', 'quiet', 'help', 'interactive', 'browser'], // 添加 browser
  });

  // 检测 browser 模式
  if (argv.browser) {
    // 启动 browser 模式，复用现有的 context 构建逻辑
    await startBrowserMode({ ...opts, argv });
    return;
  }
  
  // ... 现有的命令处理逻辑 ...
}

// 新增 browser 模式启动函数
async function startBrowserMode(opts: RunCliOpts & { argv: any }) {
  const { argv } = opts;
  
  // 完全复用现有的 context 构建逻辑
  const context = await buildContext({ 
    ...opts, 
    argv: { ...argv, _: argv._.length > 0 ? argv._ : [''] },
    command: 'browser'
  });
  
  // 设置 browser 模式特有配置
  context.config = {
    ...context.config,
    stream: true, // Browser 模式强制启用流式输出
    browserMode: true
  };
  
  // 启动 browser 服务器，传入完整的 context
  const { runBrowserServer } = await import('./commands/browser.js');
  await runBrowserServer({ context, prompt: argv._[0] });
}
```

### 2. Browser 命令实现（集成现有服务）

```typescript
// src/commands/browser.ts
import { Context } from '../types';
import { startBrowserServer } from '../../browser/src/server/app.js';

export async function runBrowserServer(opts: { 
  context: Context; 
  prompt?: string 
}) {
  const { context, prompt } = opts;
  
  // 从命令行参数获取配置
  const port = context.argv.port || 3000;
  const host = context.argv.host || 'localhost';
  
  console.log(`启动 Takumi Browser 模式...`);
  console.log(`复用现有 LLM 查询架构: ${context.config.model}`);
  console.log(`可用工具: ${Object.keys(await import('../tools/tools.js').then(m => m.getAllTools({ context }))).join(', ')}`);
  console.log(`服务地址: http://${host}:${port}`);
  
  // 启动服务器，传入完整的 context，确保与 CLI 模式使用相同的配置和插件
  await startBrowserServer({
    port,
    host,
    context, // 传入完整的 context，包含所有插件、工具、配置
    initialPrompt: prompt
  });
}
```

### 3. WebSocket 流式通信（复用现有 query.ts 架构）

```typescript
// browser/src/server/websocket/handler.ts
import { WebSocket } from 'ws';
import { askQuery, editQuery } from '../../../src/llms/query.js';
import { Context } from '../../../src/types.js';

export class WebSocketManager {
  private connections = new Map<string, WebSocket>();
  private sessionContexts = new Map<string, Context>();
  
  constructor() {
    // 初始化
  }
  
  // 连接管理
  addConnection(sessionId: string, ws: WebSocket, context: Context) {
    this.connections.set(sessionId, ws);
    this.sessionContexts.set(sessionId, context);
    this.setupWebSocketEvents(sessionId, ws);
    this.setupPluginHooks(sessionId, context);
  }
  
  removeConnection(sessionId: string) {
    this.connections.delete(sessionId);
    this.sessionContexts.delete(sessionId);
  }
  
  // 设置插件钩子监听，转发事件到 WebSocket
  private setupPluginHooks(sessionId: string, context: Context) {
    // 创建 Browser 插件实例，监听所有相关钩子
    const browserPlugin = {
      name: 'browser-websocket',
      
      // 查询开始
      queryStart: (args: any) => {
        this.sendMessage(sessionId, {
          id: generateId(),
          type: 'event',
          event: 'query_start',
          data: {
            queryId: args.id,
            prompt: args.prompt,
            tools: Object.keys(args.tools)
          },
          timestamp: Date.now()
        });
      },
      
      // LLM 响应流式输出
      query: (args: any) => {
        this.sendMessage(sessionId, {
          id: args.id,
          type: 'chat',
          role: 'assistant',
          content: args.text,
          streaming: true,
          finished: false,
          tokenUsage: args.tokenUsage,
          timestamp: Date.now()
        });
      },
      
      // 工具调用开始
      toolStart: (args: any) => {
        this.sendMessage(sessionId, {
          id: generateId(),
          type: 'action',
          action: args.toolUse.toolName,
          args: args.toolUse.arguments,
          status: 'running',
          queryId: args.queryId,
          timestamp: Date.now()
        });
      },
      
      // 工具调用结束
      toolEnd: (args: any) => {
        this.sendMessage(sessionId, {
          id: generateId(),
          type: 'action',
          action: args.toolUse.toolName,
          args: args.toolUse.arguments,
          status: 'completed',
          queryId: args.queryId,
          executionTime: args.endTime - args.startTime,
          timestamp: Date.now()
        });
      },
      
      // 消息添加
      message: (args: any) => {
        args.messages.forEach(msg => {
          this.sendMessage(sessionId, {
            id: generateId(),
            type: 'message',
            role: msg.role,
            content: msg.content,
            queryId: args.queryId,
            timestamp: Date.now()
          });
        });
      },
      
      // 查询结束
      queryEnd: (args: any) => {
        this.sendMessage(sessionId, {
          id: args.id,
          type: 'chat',
          role: 'assistant',
          content: args.text,
          streaming: false,
          finished: true,
          executionTime: args.endTime - args.startTime,
          timestamp: Date.now()
        });
        
        this.sendMessage(sessionId, {
          id: generateId(),
          type: 'event',
          event: 'query_end',
          data: {
            queryId: args.id,
            totalTime: args.endTime - args.startTime,
            messagesCount: args.messages.length
          },
          timestamp: Date.now()
        });
      },
      
      // 文件操作钩子
      editFile: (args: any) => {
        this.sendMessage(sessionId, {
          id: generateId(),
          type: 'file_op',
          operation: 'update',
          path: args.filePath,
          oldContent: args.oldContent,
          newContent: args.newContent,
          timestamp: Date.now()
        });
      },
      
      createFile: (args: any) => {
        this.sendMessage(sessionId, {
          id: generateId(),
          type: 'file_op',
          operation: 'create',
          path: args.filePath,
          content: args.content,
          timestamp: Date.now()
        });
      }
    };
    
    // 动态注册插件到当前会话的 context
    context.pluginManager['#plugins'].push(browserPlugin);
  }
  
  // 使用现有的 askQuery/editQuery 逻辑
  async handleChatMessage(sessionId: string, prompt: string, mode: 'ask' | 'edit' = 'ask') {
    const context = this.sessionContexts.get(sessionId);
    if (!context) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    try {
      // 发送开始状态
      this.sendMessage(sessionId, {
        id: generateId(),
        type: 'event',
        event: 'chat_start',
        data: { mode, prompt },
        timestamp: Date.now()
      });
      
      // 直接使用现有的查询逻辑，插件钩子会自动处理流式输出
      const result = mode === 'ask' 
        ? await askQuery({ context, prompt })
        : await editQuery({ context, prompt });
      
      return result;
      
    } catch (error) {
      this.sendMessage(sessionId, {
        id: generateId(),
        type: 'event',
        event: 'error',
        data: { error: error.message, stack: error.stack },
        timestamp: Date.now()
      });
      throw error;
    }
  }
  
  // 发送消息到客户端
  private sendMessage(sessionId: string, message: any) {
    const ws = this.connections.get(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  // 设置 WebSocket 事件处理
  private setupWebSocketEvents(sessionId: string, ws: WebSocket) {
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(sessionId, message);
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
        this.sendMessage(sessionId, {
          id: generateId(),
          type: 'event',
          event: 'error',
          data: { error: 'Invalid message format' },
          timestamp: Date.now()
        });
      }
    });
    
    ws.on('close', () => {
      this.removeConnection(sessionId);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
  
  // 处理收到的消息
  private async handleMessage(sessionId: string, message: any) {
    switch (message.type) {
      case 'chat':
        if (message.role === 'user') {
          await this.handleChatMessage(sessionId, message.content, message.mode || 'ask');
        }
        break;
      case 'config_update':
        await this.handleConfigUpdate(sessionId, message.config);
        break;
      case 'session_info':
        await this.handleSessionInfo(sessionId);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }
  
  // 配置更新
  private async handleConfigUpdate(sessionId: string, config: any) {
    const context = this.sessionContexts.get(sessionId);
    if (context) {
      // 更新 context 配置
      Object.assign(context.config, config);
      this.sendMessage(sessionId, {
        id: generateId(),
        type: 'event',
        event: 'config_updated',
        data: context.config,
        timestamp: Date.now()
      });
    }
  }
  
  // 会话信息
  private async handleSessionInfo(sessionId: string) {
    const context = this.sessionContexts.get(sessionId);
    if (context) {
      this.sendMessage(sessionId, {
        id: generateId(),
        type: 'session_info',
        data: {
          sessionId,
          config: context.config,
          workingDirectory: context.cwd,
          availableTools: Object.keys(await import('../../../src/tools/tools.js').then(m => m.getAllTools({ context }))),
          mcpClients: context.mcpClients?.map(client => client.name) || []
        },
        timestamp: Date.now()
      });
    }
  }
}

// 生成唯一ID
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

## 插件扩展 Browser 模式设计

### 1. 扩展插件接口（Browser 模式专有钩子）

```typescript
// src/pluginManager/types.ts - 扩展插件接口
export const PluginSchema = z.object({
  // ... 现有钩子 ...
  
  // Browser 模式专有钩子
  browserInit: z
    .function(
      z.tuple([z.object({ sessionId: z.string(), context: z.any() })]),
      z.void()
    )
    .optional(),
  
  browserMessage: z
    .function(
      z.tuple([
        z.object({
          sessionId: z.string(),
          messageType: z.string(),
          data: z.any(),
          sendMessage: z.function()
        })
      ]),
      z.void()
    )
    .optional(),
  
  browserUIComponents: z
    .function(
      z.tuple([]),
      z.object({
        panels: z.array(z.object({
          id: z.string(),
          title: z.string(),
          resourceUrl: z.string(), // 静态资源地址 (CDN 或本地路径)
          placement: z.enum(['sidebar', 'main', 'footer', 'modal']),
          props: z.record(z.any()).optional() // 传递给组件的属性
        })).optional(),
        messageRenderers: z.array(z.object({
          type: z.string(),
          resourceUrl: z.string() // 静态资源地址
        })).optional(),
        toolActions: z.array(z.object({
          toolName: z.string(),
          actions: z.array(z.object({
            id: z.string(),
            label: z.string(),
            icon: z.string().optional(),
            resourceUrl: z.string().optional() // 自定义操作界面
          }))
        })).optional(),
        globalCSS: z.array(z.string()).optional(), // 全局样式文件
        globalJS: z.array(z.string()).optional()   // 全局脚本文件
      })
    )
    .optional(),
  
  browserCustomMessage: z
    .function(
      z.tuple([
        z.object({
          sessionId: z.string(),
          messageType: z.string(),
          data: z.any()
        })
      ]),
      z.any()
    )
    .optional()
});
```

### 2. 插件 Browser 扩展示例

```typescript
// 示例：Git 插件扩展 Browser 模式
// src/plugins/git-browser.ts
import { Plugin } from '../types';

export const gitBrowserPlugin: Plugin = {
  name: 'git-browser',
  
  // 标准钩子 - CLI 和 Browser 模式共用
  queryEnd: ({ text, id }) => {
    // 检查是否有 Git 相关操作
    if (text.includes('git') || text.includes('commit')) {
      console.log('检测到 Git 操作');
    }
  },
  
  toolEnd: ({ toolUse, startTime, endTime }) => {
    if (toolUse.toolName === 'BashTool' && 
        JSON.stringify(toolUse.arguments).includes('git')) {
      console.log(`Git 命令执行完成: ${endTime - startTime}ms`);
    }
  },
  
  // Browser 模式专有钩子
  browserInit: ({ sessionId, context }) => {
    console.log(`Git 插件在 Browser 模式中初始化: ${sessionId}`);
  },
  
  browserMessage: ({ sessionId, messageType, data, sendMessage }) => {
    if (messageType === 'git_status_request') {
      // 处理前端请求的 Git 状态
      const gitStatus = getGitStatus(data.workingDir);
      sendMessage({
        id: generateId(),
        type: 'git_status_response',
        data: gitStatus,
        timestamp: Date.now()
      });
    }
  },
  
  // 注册自定义 UI 组件 (使用静态资源)
  browserUIComponents: () => ({
    panels: [
      {
        id: 'git-status',
        title: 'Git 状态',
        placement: 'sidebar',
        resourceUrl: 'https://cdn.jsdelivr.net/npm/takumi-plugin-git@1.0.0/dist/GitStatusPanel.js',
        // 或本地路径: './node_modules/takumi-plugin-git/dist/GitStatusPanel.js'
        props: {
          workingDir: process.cwd(),
          theme: 'dark'
        }
      }
    ],
    
    messageRenderers: [
      {
        type: 'git_commit_result',
        resourceUrl: 'https://cdn.jsdelivr.net/npm/takumi-plugin-git@1.0.0/dist/GitCommitRenderer.js'
      }
    ],
    
    toolActions: [
      {
        toolName: 'BashTool',
        actions: [
          {
            id: 'view-git-log',
            label: '查看 Git 日志',
            icon: '📋',
            resourceUrl: 'https://cdn.jsdelivr.net/npm/takumi-plugin-git@1.0.0/dist/GitLogViewer.js'
          },
          {
            id: 'git-diff',
            label: '查看差异',
            icon: '🔍',
            resourceUrl: 'https://cdn.jsdelivr.net/npm/takumi-plugin-git@1.0.0/dist/GitDiffViewer.js'
          }
        ]
      }
    ],
    
    // 全局样式和脚本
    globalCSS: [
      'https://cdn.jsdelivr.net/npm/takumi-plugin-git@1.0.0/dist/styles.css'
    ],
    globalJS: [
      'https://cdn.jsdelivr.net/npm/takumi-plugin-git@1.0.0/dist/utils.js'
    ]
  }),
  
  // 处理自定义消息
  browserCustomMessage: ({ sessionId, messageType, data }) => {
    switch (messageType) {
      case 'view_git_log':
        return execGitLog(data.path);
      case 'git_diff':
        return execGitDiff(data.file);
      default:
        return null;
    }
  }
};

function getGitStatus(workingDir: string) {
  // 实现 Git 状态获取逻辑
  return {
    branch: 'main',
    changes: [
      { path: 'src/file1.ts', status: 'M' },
      { path: 'src/file2.ts', status: 'A' }
    ]
  };
}
```

### 3. Browser 模式插件管理器增强

```typescript
// browser/src/server/websocket/plugin-manager.ts
export class BrowserPluginManager {
  private wsManager: WebSocketManager;
  private pluginComponents = new Map<string, any>();
  
  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
  }
  
  // 初始化插件的 Browser 扩展
  async initializePlugins(sessionId: string, context: Context) {
    const plugins = context.pluginManager['#plugins'];
    
    for (const plugin of plugins) {
      // 调用插件的 browserInit 钩子
      if (plugin.browserInit) {
        await plugin.browserInit({ sessionId, context });
      }
      
      // 注册插件的 UI 组件
      if (plugin.browserUIComponents) {
        const components = await plugin.browserUIComponents();
        this.registerPluginComponents(plugin.name, components);
      }
      
      // 注册自定义消息处理器
      if (plugin.browserMessage || plugin.browserCustomMessage) {
        this.registerMessageHandlers(sessionId, plugin);
      }
    }
    
    // 发送插件组件信息到前端
    this.sendPluginInfo(sessionId);
  }
  
  // 注册插件组件
  private registerPluginComponents(pluginName: string, components: any) {
    this.pluginComponents.set(pluginName, components);
  }
  
  // 注册消息处理器
  private registerMessageHandlers(sessionId: string, plugin: any) {
    // 扩展 WebSocket 消息处理
    const originalHandler = this.wsManager['handleMessage'];
    
    this.wsManager['handleMessage'] = async (sessionId: string, message: any) => {
      // 先调用插件的消息处理器
      if (plugin.browserMessage) {
        await plugin.browserMessage({
          sessionId,
          messageType: message.type,
          data: message.data,
          sendMessage: (msg: any) => this.wsManager['sendMessage'](sessionId, msg)
        });
      }
      
      // 处理自定义消息类型
      if (message.type.startsWith('plugin_') && plugin.browserCustomMessage) {
        const result = await plugin.browserCustomMessage({
          sessionId,
          messageType: message.type,
          data: message.data
        });
        
        if (result) {
          this.wsManager['sendMessage'](sessionId, {
            id: generateId(),
            type: 'plugin_response',
            pluginName: plugin.name,
            originalType: message.type,
            data: result,
            timestamp: Date.now()
          });
        }
      }
      
      // 调用原始处理器
      await originalHandler.call(this.wsManager, sessionId, message);
    };
  }
  
  // 发送插件信息到前端
  private sendPluginInfo(sessionId: string) {
    const pluginInfo = Array.from(this.pluginComponents.entries()).map(
      ([pluginName, components]) => ({
        pluginName,
        components
      })
    );
    
    this.wsManager['sendMessage'](sessionId, {
      id: generateId(),
      type: 'plugin_components',
      data: pluginInfo,
      timestamp: Date.now()
    });
  }
}
```

### 4. 前端静态资源加载器

```typescript
// browser/src/components/Plugin/StaticResourceLoader.tsx
import React, { useEffect, useState, useRef } from 'react';

interface PluginComponentProps {
  resourceUrl: string;
  props: any;
}

const StaticPluginComponent: React.FC<PluginComponentProps> = ({ 
  resourceUrl, 
  props 
}) => {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadComponent = async () => {
      try {
        setLoading(true);
        setError(null);

        // 检查是否为本地路径或 CDN 地址
        if (resourceUrl.startsWith('http') || resourceUrl.startsWith('//')) {
          // CDN 资源加载
          const module = await import(/* webpackIgnore: true */ resourceUrl);
          setComponent(() => module.default || module);
        } else {
          // 本地资源加载
          const module = await import(resourceUrl);
          setComponent(() => module.default || module);
        }
      } catch (err) {
        console.error('插件组件加载失败:', err);
        setError(`无法加载组件: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadComponent();
  }, [resourceUrl]);

  if (loading) {
    return <div className="plugin-loading">加载插件组件中...</div>;
  }

  if (error) {
    return <div className="plugin-error">插件加载失败: {error}</div>;
  }

  if (!Component) {
    return <div className="plugin-error">插件组件不可用</div>;
  }

  return <Component {...props} ref={containerRef} />;
};

// 样式和脚本资源加载器
export const ResourceLoader = {
  loadCSS: (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${url}"]`)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = reject;
      document.head.appendChild(link);
    });
  },

  loadJS: (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
};

// 插件面板管理器
export const PluginPanelManager: React.FC<{
  pluginComponents: any[];
  sessionId: string;
  sendMessage: (msg: any) => void;
}> = ({ pluginComponents, sessionId, sendMessage }) => {
  useEffect(() => {
    // 加载全局样式和脚本
    const loadGlobalResources = async () => {
      for (const plugin of pluginComponents) {
        const { globalCSS = [], globalJS = [] } = plugin.components || {};
        
        // 加载样式文件
        for (const cssUrl of globalCSS) {
          try {
            await ResourceLoader.loadCSS(cssUrl);
          } catch (error) {
            console.warn(`加载样式失败: ${cssUrl}`, error);
          }
        }
        
        // 加载脚本文件
        for (const jsUrl of globalJS) {
          try {
            await ResourceLoader.loadJS(jsUrl);
          } catch (error) {
            console.warn(`加载脚本失败: ${jsUrl}`, error);
          }
        }
      }
    };

    loadGlobalResources();
  }, [pluginComponents]);

  const sidebarPanels = pluginComponents.filter(
    comp => comp.components?.panels?.some(p => p.placement === 'sidebar')
  );
  
  return (
    <div className="plugin-panels">
      {sidebarPanels.map(plugin => 
        plugin.components.panels
          .filter(panel => panel.placement === 'sidebar')
          .map(panel => (
            <div key={`${plugin.pluginName}-${panel.id}`} className="plugin-panel">
              <h3>{panel.title}</h3>
              <StaticPluginComponent
                resourceUrl={panel.resourceUrl}
                props={{ 
                  sessionId, 
                  sendMessage,
                  ...panel.props 
                }}
              />
            </div>
          ))
      )}
    </div>
  );
};
```

### 5. 通过插件进行模型交互

所有与模型的交互都可以通过插件的钩子系统进行，确保 CLI 和 Browser 模式的完全一致性：

```typescript
// src/plugins/model-interceptor.ts - 模型交互插件示例
export const modelInterceptorPlugin: Plugin = {
  name: 'model-interceptor',
  
  // 拦截查询开始，可以修改 prompt 或添加上下文
  queryStart: ({ prompt, id, system, tools }) => {
    console.log(`查询开始 [${id}]: ${prompt}`);
    // 可以记录查询历史、添加额外上下文等
  },
  
  // 拦截模型响应，可以后处理结果
  query: ({ prompt, text, id, tools, tokenUsage }) => {
    console.log(`模型响应 [${id}]: ${text.length} 字符`);
    // 可以分析响应、触发后续操作等
  },
  
  // 拦截工具调用，可以修改参数或记录调用
  toolStart: ({ toolUse, queryId }) => {
    console.log(`工具调用开始: ${toolUse.toolName}`);
    // 可以记录工具使用情况、验证参数等
  },
  
  // 处理工具调用结果
  toolEnd: ({ toolUse, startTime, endTime, queryId }) => {
    const duration = endTime - startTime;
    console.log(`工具调用完成: ${toolUse.toolName} (${duration}ms)`);
    // 可以分析工具性能、记录结果等
  },
  
  // Browser 模式特有: 处理前端发起的模型交互
  browserMessage: ({ sessionId, messageType, data, sendMessage }) => {
    if (messageType === 'custom_query') {
      // 前端可以通过自定义消息类型发起查询
      sendMessage({
        id: generateId(),
        type: 'custom_query_response',
        data: { status: 'processing' },
        timestamp: Date.now()
      });
    }
  },
  
  // Browser 模式: 提供自定义查询界面
  browserUIComponents: () => ({
    panels: [
      {
        id: 'custom-query',
        title: '自定义查询',
        placement: 'main',
        resourceUrl: 'https://cdn.jsdelivr.net/npm/takumi-plugin-query@1.0.0/dist/QueryPanel.js',
        props: {
          allowedModels: ['gpt-4', 'claude-3.5-sonnet'],
          maxTokens: 4000
        }
      }
    ]
  })
};
```

### 6. 插件资源开发和部署

#### 插件组件开发示例

```javascript
// 插件开发: GitStatusPanel.js (UMD 格式)
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react')) :
  typeof define === 'function' && define.amd ? define(['exports', 'react'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.GitStatusPanel = {}, global.React));
})(this, (function (exports, React) {
  'use strict';

  const GitStatusPanel = ({ sessionId, sendMessage, workingDir, theme }) => {
    const [gitStatus, setGitStatus] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      // 请求 Git 状态
      sendMessage({
        type: 'git_status_request',
        data: { workingDir }
      });

      // 监听响应
      const handleMessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'git_status_response') {
          setGitStatus(message.data);
          setLoading(false);
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [workingDir, sendMessage]);

    if (loading) {
      return React.createElement('div', { className: 'loading' }, '加载中...');
    }

    return React.createElement('div', {
      className: `git-status-panel ${theme}`
    }, [
      React.createElement('h3', { key: 'title' }, 'Git 状态'),
      React.createElement('div', { key: 'content' }, [
        React.createElement('p', { key: 'branch' }, `分支: ${gitStatus.branch}`),
        React.createElement('p', { key: 'changes' }, `变更: ${gitStatus.changes?.length || 0} 个文件`),
        React.createElement('ul', { key: 'list' }, 
          gitStatus.changes?.map(file => 
            React.createElement('li', { 
              key: file.path,
              className: `file-${file.status.toLowerCase()}`
            }, `${file.status} ${file.path}`)
          )
        )
      ])
    ]);
  };

  exports.default = GitStatusPanel;
}));
```

#### 插件包结构

```
takumi-plugin-git/
├── package.json
├── dist/
│   ├── GitStatusPanel.js      # UMD 格式的 React 组件
│   ├── GitCommitRenderer.js   # 消息渲染器组件
│   ├── GitLogViewer.js        # 工具操作组件
│   ├── styles.css             # 样式文件
│   └── utils.js               # 工具函数
├── src/                       # 源码 (开发时)
└── README.md
```

#### package.json 示例

```json
{
  "name": "takumi-plugin-git",
  "version": "1.0.0",
  "description": "Git integration plugin for Takumi",
  "main": "dist/index.js",
  "browser": {
    "./dist/GitStatusPanel.js": "./dist/GitStatusPanel.js"
  },
  "files": ["dist/**/*"],
  "peerDependencies": {
    "react": ">=18.0.0"
  },
  "jsdelivr": "dist/",
  "unpkg": "dist/"
}
```

### 7. 使用示例

```bash
# 安装支持 Browser 模式的第三方插件
npm install takumi-plugin-git

# 在项目中启用插件
# takumi.config.js
export default {
  plugins: [
    'takumi-plugin-git',
    'takumi-plugin-docker',
    'takumi-plugin-test-runner'
  ]
};

# 启动 Browser 模式，自动加载所有插件的 Browser 扩展
takumi --browser

# 插件在 CLI 和 Browser 模式下都生效
takumi "检查 Git 状态并提交代码" --browser
# 在 Web 界面中会显示:
# 1. Git 状态面板 (插件提供的静态组件)
# 2. 实时的 Git 命令执行过程
# 3. 可视化的提交结果
# 4. 自定义的 Git 操作按钮

# 插件组件从 CDN 或本地加载，无需编译
# https://cdn.jsdelivr.net/npm/takumi-plugin-git@1.0.0/dist/GitStatusPanel.js
```

### 4. 前端流式文本组件（基于 OpenHands 设计）

```typescript
// browser/src/components/Chat/StreamingMessage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Card, Typography, Badge, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';

interface StreamingMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    streaming?: boolean;
    finished?: boolean;
    timestamp: number;
  };
  actions?: AgentAction[];
}

const StreamingMessage: React.FC<StreamingMessageProps> = ({ 
  message, 
  actions = [] 
}) => {
  const [displayContent, setDisplayContent] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  
  // 流式显示效果
  useEffect(() => {
    if (message.streaming && !message.finished) {
      setDisplayContent(message.content);
    } else {
      // 非流式或已完成，直接显示全部内容
      setDisplayContent(message.content);
    }
  }, [message.content, message.streaming, message.finished]);
  
  // 自动滚动到底部
  useEffect(() => {
    if (contentRef.current && message.streaming) {
      contentRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayContent, message.streaming]);
  
  const isAssistant = message.role === 'assistant';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`message-container ${isAssistant ? 'assistant' : 'user'}`}
      ref={contentRef}
    >
      <Card
        size="small"
        className={`message-card ${isAssistant ? 'assistant-card' : 'user-card'}`}
        styles={{
          body: { padding: '12px 16px' }
        }}
      >
        {/* 消息头部 */}
        <div className="message-header">
          <Badge 
            color={isAssistant ? 'blue' : 'green'} 
            text={isAssistant ? 'Assistant' : 'User'} 
          />
          {message.streaming && (
            <Spin size="small" className="streaming-indicator" />
          )}
          <Typography.Text type="secondary" className="timestamp">
            {new Date(message.timestamp).toLocaleTimeString()}
          </Typography.Text>
        </div>
        
        {/* 消息内容 */}
        <div className="message-content">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {displayContent}
          </ReactMarkdown>
          
          {/* 流式输出光标 */}
          {message.streaming && !message.finished && (
            <motion.span
              className="typing-cursor"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              |
            </motion.span>
          )}
        </div>
        
        {/* Agent 动作显示 */}
        <AnimatePresence>
          {actions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="agent-actions"
            >
              {actions.map((action) => (
                <AgentActionCard key={action.id} action={action} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

// Agent 动作卡片组件
const AgentActionCard: React.FC<{ action: AgentAction }> = ({ action }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'running': return 'processing';
      case 'completed': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };
  
  const getActionIcon = (actionType: string) => {
    // 根据动作类型返回对应图标
    switch (actionType) {
      case 'read_file': return '📖';
      case 'write_file': return '✏️';
      case 'run_command': return '⚡';
      case 'search_code': return '🔍';
      default: return '🔧';
    }
  };
  
  return (
    <Card size="small" className="agent-action-card">
      <div className="action-header">
        <span className="action-icon">{getActionIcon(action.action)}</span>
        <Typography.Text strong>{action.action}</Typography.Text>
        <Badge status={getStatusColor(action.status)} text={action.status} />
      </div>
      
      {action.args && (
        <div className="action-args">
          <Typography.Text type="secondary">
            {JSON.stringify(action.args, null, 2)}
          </Typography.Text>
        </div>
      )}
      
      {action.result && action.status === 'completed' && (
        <div className="action-result">
          <Typography.Text>{action.result}</Typography.Text>
        </div>
      )}
      
      {action.error && action.status === 'failed' && (
        <div className="action-error">
          <Typography.Text type="danger">{action.error}</Typography.Text>
        </div>
      )}
    </Card>
  );
};

export default StreamingMessage;

// 样式（使用 UnoCSS 或 CSS-in-JS）
const styles = `
.message-container {
  margin-bottom: 16px;
  max-width: 100%;
}

.message-container.user {
  display: flex;
  justify-content: flex-end;
}

.message-container.assistant {
  display: flex;
  justify-content: flex-start;
}

.message-card {
  max-width: 80%;
  min-width: 200px;
}

.assistant-card {
  background: #f6f8fa;
}

.user-card {
  background: #e3f2fd;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.streaming-indicator {
  margin-left: 8px;
}

.timestamp {
  margin-left: auto;
}

.message-content {
  position: relative;
}

.typing-cursor {
  color: #1890ff;
  font-weight: bold;
  font-size: 16px;
  margin-left: 2px;
}

.agent-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e8e8e8;
}

.agent-action-card {
  margin-bottom: 8px;
}

.action-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-icon {
  font-size: 16px;
}

.action-args,
.action-result,
.action-error {
  margin-top: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.action-error {
  background: #fff2f0;
}
`;
```

### 5. 前端 WebSocket Hooks 实现

```typescript
// browser/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLatest } from 'ahooks';

interface UseWebSocketOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = (options: UseWebSocketOptions) => {
  const {
    url,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onOpen,
    onClose,
    onError
  } = options;

  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout>();

  const latestOnMessage = useLatest(onMessage);
  const latestOnOpen = useLatest(onOpen);
  const latestOnClose = useLatest(onClose);
  const latestOnError = useLatest(onError);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setReadyState(WebSocket.OPEN);
        reconnectAttemptsRef.current = 0;
        latestOnOpen.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          latestOnMessage.current?.(message);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      ws.onclose = () => {
        setReadyState(WebSocket.CLOSED);
        latestOnClose.current?.();
        
        // 尝试重连
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        setReadyState(WebSocket.CLOSED);
        latestOnError.current?.(error);
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [url, reconnectInterval, maxReconnectAttempts]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    wsRef.current?.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    readyState,
    lastMessage,
    sendMessage,
    connect,
    disconnect
  };
};

// browser/src/hooks/useStreaming.ts
import { useState, useCallback, useRef } from 'react';

interface StreamingMessage {
  id: string;
  content: string;
  finished: boolean;
  timestamp: number;
}

export const useStreaming = () => {
  const [messages, setMessages] = useState<Map<string, StreamingMessage>>(new Map());
  const messageBuffersRef = useRef<Map<string, string>>(new Map());

  const handleStreamingMessage = useCallback((message: any) => {
    if (message.type === 'chat' && message.streaming) {
      const { id, content, delta, finished } = message;
      
      setMessages(prev => {
        const newMessages = new Map(prev);
        
        if (delta) {
          // 增量更新
          const currentBuffer = messageBuffersRef.current.get(id) || '';
          const newBuffer = currentBuffer + delta;
          messageBuffersRef.current.set(id, newBuffer);
          
          newMessages.set(id, {
            id,
            content: newBuffer,
            finished: finished || false,
            timestamp: message.timestamp
          });
        } else {
          // 全量更新
          newMessages.set(id, {
            id,
            content,
            finished: finished || false,
            timestamp: message.timestamp
          });
        }
        
        return newMessages;
      });
      
      // 如果消息已完成，清理缓冲区
      if (finished) {
        messageBuffersRef.current.delete(id);
      }
    }
  }, []);

  const getStreamingMessage = useCallback((id: string) => {
    return messages.get(id);
  }, [messages]);

  const clearMessage = useCallback((id: string) => {
    setMessages(prev => {
      const newMessages = new Map(prev);
      newMessages.delete(id);
      return newMessages;
    });
    messageBuffersRef.current.delete(id);
  }, []);

  return {
    messages: Array.from(messages.values()),
    handleStreamingMessage,
    getStreamingMessage,
    clearMessage
  };
};

// browser/src/hooks/useAgent.ts
import { useState, useCallback } from 'react';

interface AgentState {
  id: string;
  status: 'idle' | 'running' | 'error';
  currentAction?: string;
  progress?: number;
  error?: string;
}

interface TaskState {
  id: string;
  status: 'created' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  description: string;
  result?: any;
  error?: string;
}

export const useAgent = () => {
  const [agentState, setAgentState] = useState<AgentState>({
    id: 'default',
    status: 'idle'
  });
  const [tasks, setTasks] = useState<Map<string, TaskState>>(new Map());
  const [actions, setActions] = useState<AgentAction[]>([]);

  const handleAgentAction = useCallback((action: AgentAction) => {
    setActions(prev => {
      const existing = prev.find(a => a.id === action.id);
      if (existing) {
        return prev.map(a => a.id === action.id ? action : a);
      } else {
        return [...prev, action];
      }
    });

    // 更新 Agent 状态
    setAgentState(prev => ({
      ...prev,
      status: action.status === 'running' ? 'running' : 
              action.status === 'failed' ? 'error' : 'idle',
      currentAction: action.status === 'running' ? action.action : undefined,
      error: action.error
    }));
  }, []);

  const handleTaskStatus = useCallback((task: TaskStatus) => {
    setTasks(prev => {
      const newTasks = new Map(prev);
      newTasks.set(task.taskId, {
        id: task.taskId,
        status: task.status,
        progress: task.progress || 0,
        description: task.description || '',
        result: task.result,
        error: task.error
      });
      return newTasks;
    });
  }, []);

  const getActiveActions = useCallback(() => {
    return actions.filter(action => 
      action.status === 'running' || action.status === 'pending'
    );
  }, [actions]);

  const getCompletedActions = useCallback(() => {
    return actions.filter(action => 
      action.status === 'completed' || action.status === 'failed'
    );
  }, [actions]);

  return {
    agentState,
    tasks: Array.from(tasks.values()),
    actions,
    handleAgentAction,
    handleTaskStatus,
    getActiveActions,
    getCompletedActions
  };
};
```

### 5. 插件集成方案（完整钩子监听）

```typescript
// src/plugins/browser.ts - Browser 插件，监听所有执行过程
import { Plugin } from '../types';

export const browserPlugin: Plugin = {
  name: 'browser',
  
  // 配置钩子
  config: () => ({
    browserMode: true,
    stream: true, // 强制启用流式输出
  }),
  
  configResolved: async ({ resolvedConfig }) => {
    if (resolvedConfig.browserMode) {
      console.log('Browser 模式已启用，所有执行过程将转发到 WebSocket');
    }
  },
  
  // CLI 生命周期钩子
  cliStart: () => {
    // Browser 模式启动
  },
  
  cliEnd: ({ startTime, endTime, error }) => {
    // Browser 模式结束
  },
  
  // 查询生命周期钩子
  queryStart: ({ prompt, id, system, tools }) => {
    // 查询开始 - 已在 WebSocketManager 中处理
    console.log(`查询开始: ${id}, 工具: ${Object.keys(tools).join(', ')}`);
  },
  
  query: ({ prompt, text, id, tools, tokenUsage, generationId }) => {
    // LLM 响应生成 - 流式输出到 WebSocket
    console.log(`LLM 响应: ${generationId}, 令牌: ${tokenUsage?.totalTokens}`);
  },
  
  queryEnd: ({ prompt, systemPrompt, queryContext, tools, messages, startTime, endTime, text, id }) => {
    // 查询结束
    const duration = endTime - startTime;
    console.log(`查询完成: ${id}, 耗时: ${duration}ms, 消息数: ${messages.length}`);
  },
  
  // 消息钩子
  message: ({ messages, queryId }) => {
    // 消息添加 - 转发到 WebSocket
    messages.forEach(msg => {
      console.log(`消息: ${msg.role} - ${msg.content.substring(0, 100)}...`);
    });
  },
  
  // 工具调用钩子
  toolStart: ({ toolUse, queryId }) => {
    // 工具调用开始
    console.log(`工具调用开始: ${toolUse.toolName}(${JSON.stringify(toolUse.arguments)})`);
  },
  
  toolEnd: ({ toolUse, startTime, endTime, queryId }) => {
    // 工具调用结束
    const duration = endTime - startTime;
    console.log(`工具调用完成: ${toolUse.toolName}, 耗时: ${duration}ms`);
  },
  
  // 文件操作钩子
  editFile: ({ filePath, oldContent, newContent }) => {
    // 文件编辑
    console.log(`文件编辑: ${filePath}, 变更: ${newContent.length - oldContent.length} 字符`);
  },
  
  createFile: ({ filePath, content }) => {
    // 文件创建
    console.log(`文件创建: ${filePath}, 大小: ${content.length} 字符`);
  },
  
  // 上下文钩子
  contextStart: ({ prompt }) => {
    // 上下文构建开始
    console.log(`上下文构建开始: ${prompt?.substring(0, 50)}...`);
  },
  
  context: ({ prompt }) => {
    // 上下文构建完成
    console.log(`上下文构建完成`);
  },
  
  // 通用信息
  generalInfo: () => ({
    name: 'Browser 模式',
    description: '通过 WebSocket 转发所有执行过程到浏览器界面',
    features: [
      '实时流式输出',
      '工具调用可视化',
      '文件操作监控',
      '执行进度跟踪'
    ]
  }),
  
  // 自定义命令（如果需要）
  commands: () => [
    {
      name: 'browser-status',
      description: '显示 Browser 模式状态',
      fn: () => {
        return {
          active: true,
          connections: 'WebSocket 连接数',
          lastActivity: new Date().toISOString()
        };
      }
    }
  ]
};

// Browser 模式专用的工具展示增强
export function enhanceToolsForBrowser(tools: Record<string, any>) {
  // 为每个工具添加额外的元数据，用于 Web 界面展示
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...tool,
        // 添加展示信息
        displayName: tool.description?.split('.')[0] || name,
        category: getToolCategory(name),
        icon: getToolIcon(name),
        webVisible: true
      }
    ])
  );
}

function getToolCategory(toolName: string): string {
  if (toolName.includes('File')) return 'file';
  if (toolName.includes('Bash')) return 'terminal';
  if (toolName.includes('Web')) return 'network';
  if (toolName.includes('Grep') || toolName.includes('Glob')) return 'search';
  return 'utility';
}

function getToolIcon(toolName: string): string {
  const icons = {
    FileReadTool: '📖',
    FileWriteTool: '✏️',
    FileEditTool: '📝',
    BashTool: '⚡',
    WebFetchTool: '🌐',
    GrepTool: '🔍',
    GlobTool: '📁',
    ThinkTool: '🤔',
    TodoTool: '📋'
  };
  return icons[toolName] || '🔧';
}
```

## 部署和构建

### 开发环境
1. Browser 项目开发：
   ```bash
   cd browser
   npm run dev  # 启动前端开发服务器
   npm run dev:server  # 启动后端 API 服务器
   npm run dev:full  # 同时启动前后端服务
   ```
2. 主项目集成测试：
   ```bash
   npm run dev -- --browser  # 从主项目启动 browser 模式
   ```

### 生产构建
1. Browser 项目构建：
   ```bash
   cd browser
   npm run build  # 构建前端资源
   npm run build:server  # 打包服务端代码
   ```
2. 集成到主项目：
   ```bash
   npm run build:browser-embed  # 将 browser 静态资源嵌入到 CLI 包中
   ```

### CLI 集成（参考 OpenHands 用法）
```bash
# 启动 browser 模式，使用默认配置
takumi --browser

# 启动 browser 模式并指定端口和主机
takumi --browser --port 3000 --host localhost

# 启动 browser 模式并带有初始提示
takumi "帮我重构这个项目的代码结构" --browser

# 启动 browser 模式并指定模型
takumi --browser -m gpt-4o

# 启动 browser 模式并指定工作目录
takumi --browser --workspace /path/to/project

# 启动 browser 模式并启用安全沙箱模式
takumi --browser --sandbox

# 启动 browser 模式的完整示例
takumi "分析项目并生成重构建议" --browser --port 8080 --host 0.0.0.0 -m sonnet-3.5 --workspace ./

# 启动 browser 模式并加载特定会话
takumi --browser --session session-id-123

# 启动 browser 模式并启用调试模式
takumi --browser --debug --log-level debug
```

## 测试策略

### 单元测试
- [ ] 后端 API 接口测试
- [ ] WebSocket 通信测试
- [ ] 前端组件单测

### 集成测试
- [ ] 前后端通信测试
- [ ] 文件操作集成测试
- [ ] 插件集成测试

### E2E 测试
- [ ] 完整用户流程测试
- [ ] 浏览器兼容性测试

## 性能优化

### 前端优化
- [ ] 代码分割和懒加载
- [ ] 虚拟滚动优化
- [ ] 防抖和节流处理
- [ ] 缓存策略

### 后端优化
- [ ] WebSocket 连接池管理
- [ ] 流式响应优化
- [ ] 文件操作性能优化
- [ ] 内存使用监控

## 风险和注意事项

### 安全性
- [ ] CSRF 防护
- [ ] XSS 防护
- [ ] 文件访问权限控制
- [ ] API 访问频率限制

### 兼容性
- [ ] 浏览器兼容性测试
- [ ] Node.js 版本兼容
- [ ] 操作系统兼容性

### 性能考虑
- [ ] 大文件处理
- [ ] 长时间连接管理
- [ ] 内存泄漏防护

## 预期时间线

- **第1-2天**: 基础架构搭建
- **第3-5天**: 核心功能实现  
- **第6-8天**: 高级功能集成
- **第9-10天**: 功能完善和测试

总计：**10个工作日**完成 MVP 版本

## 后续迭代计划

### v1.1 版本（参考 OpenHands Roadmap）
- [ ] 多人协作支持和实时协作编辑
- [ ] 插件市场集成和自定义工具支持
- [ ] 更多 LLM 提供商支持（Anthropic、Google、本地模型等）
- [ ] Agent 行为记录和回放功能
- [ ] 高级代码分析和重构建议

### v1.2 版本
- [ ] 移动端适配和响应式设计
- [ ] 离线模式支持和本地 LLM 集成
- [ ] 高级编辑器集成（VS Code 扩展）
- [ ] Docker 容器化部署支持
- [ ] 性能监控和分析面板
- [ ] 多语言项目支持和国际化

## 结论

通过深度参考 [OpenHands](https://github.com/All-Hands-AI/OpenHands) 的架构设计和用户体验，同时最大化复用 Takumi 现有的核心架构，我们将构建一个功能完整、用户友好的 browser 模式。该实现将：

1. **100% 复用现有 LLM 查询架构**：直接使用 `src/llms/query.ts` 的完整逻辑，确保 CLI 和 Web 模式行为完全一致
2. **插件钩子系统集成**：通过监听所有插件钩子（`queryStart`、`toolStart`、`toolEnd`、`message` 等）实现执行过程的完整可视化
3. **工具调用透明化**：复用现有的工具系统（`getAllTools`、`getAskTools`），在 Web 界面中展示每个工具调用的详细信息
4. **流式输出复用**：利用现有的流式处理逻辑（`context.config.stream`），通过 WebSocket 转发到前端
5. **上下文管理一致性**：复用现有的上下文构建逻辑（`getContext`），确保 Web 模式获得相同的项目信息
6. **配置和插件生态**：完全继承现有的配置系统、插件管理器和 MCP 客户端
7. **借鉴 OpenHands 的 UX 设计**：在保持架构复用的基础上，提供现代化的用户界面体验

Browser 模式将通过 `takumi --browser` 的方式启动，为开发者提供类似 OpenHands 的强大 AI 编程体验，同时保持与现有 CLI 命令体系的完美融合。

### 核心亮点

- 🚀 **流式体验**：实时响应和流式输出，直接复用 `query.ts` 的流式逻辑，确保与 CLI 模式完全一致
- 🤖 **执行过程透明化**：通过插件钩子系统完整展示 AI 的思考、工具调用、文件操作等所有执行步骤
- 📁 **工具调用可视化**：实时展示每个工具的调用参数、执行状态、返回结果和耗时
- 🔧 **工具生态复用**：完全继承现有的工具系统（FileEditTool、BashTool、WebFetchTool 等）
- 💻 **现代界面**：基于 Ant Design 的美观现代化界面，参考 OpenHands 的 UX 设计
- 🔄 **架构一致性**：CLI 和 Web 模式使用完全相同的配置、插件、工具和查询逻辑
- 🎯 **零架构分歧**：避免维护两套不同的逻辑，所有核心功能都通过复用现有代码实现

### 技术优势

- **开发效率**：无需重写核心逻辑，专注于前端界面和用户体验
- **维护性**：CLI 和 Web 模式共享代码，bug 修复和功能增强同时生效
- **一致性**：用户在不同模式下获得完全相同的 AI 能力和工具支持
- **扩展性**：新增工具和插件自动在两种模式中可用
- **插件生态复用**：现有插件通过少量代码即可支持 Browser 模式
- **静态资源加载**：插件组件通过 CDN 或本地路径加载，无需编译和打包
- **安全性保证**：避免动态代码执行，使用标准的模块加载机制
- **部署灵活性**：插件可独立发布到 CDN，支持版本管理和缓存
- **双向通信**：插件可以与前端进行实时交互，支持复杂的用户界面
- **模型交互统一**：所有模型交互都通过插件钩子系统，确保逻辑一致性

### 插件扩展能力总结

通过插件系统，Takumi Browser 模式具备了强大的扩展能力：

#### 🔌 **插件类型支持**
- **监控插件**：Git 状态、Docker 容器、数据库连接等
- **工具增强插件**：代码格式化、测试运行、部署监控等  
- **可视化插件**：图表展示、代码地图、性能分析等
- **集成插件**：第三方服务集成、API 调用监控等

#### 🎨 **界面扩展能力**
- **侧边栏面板**：插件可添加专用的工具面板
- **消息渲染器**：自定义特定类型消息的显示方式
- **工具操作按钮**：为现有工具添加快捷操作
- **模态对话框**：复杂交互的弹窗界面

#### 🔄 **逻辑复用保证**
- 插件的**核心逻辑**在 CLI 和 Browser 模式中完全一致
- 只需要额外实现 `browserUIComponents` 等 Browser 专有钩子
- 现有的 `queryStart`、`toolEnd` 等钩子无需修改
- 保证插件行为的一致性和可预测性

#### 📦 **第三方插件生态**
```bash
# 示例插件生态
takumi-plugin-git-browser      # Git 可视化管理
takumi-plugin-docker-monitor   # Docker 容器监控  
takumi-plugin-test-runner      # 测试结果可视化
takumi-plugin-performance      # 性能分析面板
takumi-plugin-database         # 数据库查询界面
takumi-plugin-deployment       # 部署状态监控
```

这将使 Takumi 成为一个真正具备现代化 Web 界面的 AI 编程助手，在提供直观用户体验的同时，保持与 CLI 模式的完全一致性和架构统一性，并具备无限的扩展可能性。 
