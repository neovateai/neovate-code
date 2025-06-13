# WebSocket Hooks 使用指南

## useWebSocketAgent

`useWebSocketAgent` 是一个用于与后端 WebSocketManager 进行实时通信的 React hook。它支持自动重连、消息缓存、类型安全的消息处理，并且可以与 `useXAgent` 无缝集成。

### 基本使用

```typescript
import { useWebSocketAgent } from '@/hooks/useWebSocketAgent';

function MyComponent() {
  const webSocketAgent = useWebSocketAgent({
    autoConnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    onChatMessage: (message) => {
      console.log('收到聊天消息:', message);
    },
    onAgentAction: (action) => {
      console.log('收到 Agent 动作:', action);
    },
    onConnect: () => {
      console.log('WebSocket 连接成功');
    },
    onDisconnect: () => {
      console.log('WebSocket 连接断开');
    },
  });

  const {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    sendChatMessage,
  } = webSocketAgent;

  return (
    <div>
      <p>连接状态: {isConnected ? '已连接' : '未连接'}</p>
      <button 
        onClick={() => sendChatMessage('Hello WebSocket!')}
        disabled={!isConnected}
      >
        发送消息
      </button>
    </div>
  );
}
```

### 与 useXAgent 集成

```typescript
import { useXAgent, useXChat } from '@ant-design/x';
import { useWebSocketAgent } from '@/hooks/useWebSocketAgent';

function ChatComponent() {
  const webSocketAgent = useWebSocketAgent({
    autoConnect: true,
    onChatMessage: (message) => {
      console.log('收到消息:', message);
    },
  });

  // 创建 XAgent 请求函数
  const agentRequest = webSocketAgent.createAgentRequest();

  // 使用 XAgent
  const [agent] = useXAgent({
    request: agentRequest,
  });

  const { onRequest, messages } = useXChat({
    agent,
    requestPlaceholder: () => ({
      content: '正在思考中...',
      role: 'assistant',
    }),
  });

  const handleSend = (content: string) => {
    if (!webSocketAgent.isConnected) {
      console.error('WebSocket 未连接');
      return;
    }

    onRequest({
      stream: true,
      message: { role: 'user', content },
    });
  };

  return (
    <div>
      {/* 渲染聊天消息 */}
      {messages?.map((msg, index) => (
        <div key={index}>
          <strong>{msg.message.role}:</strong> {msg.message.content}
        </div>
      ))}
      
      {/* 发送消息输入框 */}
      <input 
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleSend(e.target.value);
            e.target.value = '';
          }
        }}
        placeholder="输入消息..."
      />
    </div>
  );
}
```

### 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `autoConnect` | `boolean` | `true` | 是否自动连接 |
| `reconnectInterval` | `number` | `3000` | 重连间隔（毫秒） |
| `maxReconnectAttempts` | `number` | `5` | 最大重连次数 |
| `onMessage` | `function` | - | 通用消息处理器 |
| `onChatMessage` | `function` | - | 聊天消息处理器 |
| `onAgentAction` | `function` | - | Agent 动作处理器 |
| `onSystemEvent` | `function` | - | 系统事件处理器 |
| `onFileOperation` | `function` | - | 文件操作处理器 |
| `onTaskStatus` | `function` | - | 任务状态处理器 |
| `onConnect` | `function` | - | 连接成功回调 |
| `onDisconnect` | `function` | - | 连接断开回调 |
| `onError` | `function` | - | 错误处理回调 |

### 返回值

| 属性/方法 | 类型 | 描述 |
|-----------|------|------|
| `socket` | `WebSocket \| null` | WebSocket 连接实例 |
| `readyState` | `WebSocketReadyState` | WebSocket 连接状态 |
| `isConnected` | `boolean` | 是否已连接 |
| `isConnecting` | `boolean` | 是否正在连接 |
| `isReady` | `boolean` | 是否准备就绪 |
| `canSend` | `boolean` | 是否可以发送消息 |
| `lastMessage` | `WebSocketMessage \| null` | 最后收到的消息 |
| `error` | `string \| null` | 错误信息 |
| `reconnectCount` | `number` | 重连次数 |
| `connect()` | `function` | 手动连接 |
| `disconnect()` | `function` | 手动断开连接 |
| `sendMessage(message)` | `function` | 发送原始消息 |
| `sendChatMessage(content, role)` | `function` | 发送聊天消息 |
| `getMessageHistory(type?)` | `function` | 获取消息历史 |
| `clearMessageHistory()` | `function` | 清空消息历史 |
| `createAgentRequest()` | `function` | 创建 XAgent 请求函数 |

### 消息类型

支持的 WebSocket 消息类型：

- `chat` - 聊天消息（支持流式输出）
- `action` - Agent 动作消息
- `event` - 系统事件消息
- `file_op` - 文件操作消息
- `task_status` - 任务状态消息
- `connected` - 连接成功消息

### 流式聊天支持

该 hook 完全支持流式聊天，当收到带有 `streaming: true` 的消息时，会自动处理增量内容：

```typescript
// 服务端发送的流式消息格式
{
  type: 'chat',
  role: 'assistant',
  content: '当前完整内容',
  delta: '增量内容',
  streaming: true,
  finished: false
}
```

### 错误处理

Hook 提供了多层错误处理：

1. WebSocket 连接错误
2. 消息解析错误
3. 自动重连机制
4. 错误状态暴露

### 最佳实践

1. **使用 useCallback 包装事件处理器**，避免不必要的重渲染
2. **检查连接状态**再发送消息
3. **处理重连逻辑**，给用户友好的反馈
4. **缓存重要消息**，防止连接断开时丢失
5. **合理设置重连参数**，避免过于频繁的重连尝试 
