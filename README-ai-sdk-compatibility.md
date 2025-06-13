# AI SDK fullStream 兼容性实现

本文档说明如何修改你的 Fastify 插件以返回兼容 AI SDK `fullStream` 类型的数据流格式。

## 主要变更

### 1. 数据流协议格式

AI SDK 使用特定的数据流协议，每个流部分的格式为：`TYPE_ID:CONTENT_JSON\n`

```typescript
// 类型映射
const typeMapping: Record<string, string> = {
  'text-delta': '0',    // 文本增量
  'error': '3',         // 错误
  'tool-call': '9',     // 工具调用
  'tool-result': 'a',   // 工具结果
  'finish': 'd',        // 完成
};
```

### 2. 响应头设置

需要设置特定的响应头以支持 AI SDK 数据流协议：

```typescript
reply.header('Content-Type', 'text/plain; charset=utf-8');
reply.header('x-vercel-ai-data-stream', 'v1'); // 关键头部
```

### 3. 流数据格式

#### 文本数据
```typescript
// 旧格式 (OpenAI 兼容)
data: {"id":"uid_123","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"}}]}

// 新格式 (AI SDK 兼容)
0:"Hello"
```

#### 工具调用
```typescript
// 工具调用
9:{"toolCallId":"call-123","toolName":"my-tool","args":{"param":"value"}}

// 工具结果
a:{"toolCallId":"call-123","toolName":"my-tool","args":{"param":"value"},"result":"output"}
```

#### 错误处理
```typescript
// 错误
3:"Error message"
```

#### 完成标记
```typescript
// 完成
d:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":20,"totalTokens":30}}
```

## 客户端使用

### 1. 使用 AI SDK React Hook

```typescript
import { useChat } from '@ai-sdk/react';

export function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat/completions',
    streamProtocol: 'data', // 使用数据流协议
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

### 2. 手动处理流

```typescript
const response = await fetch('/api/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    stream: true,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const [typeId, ...contentParts] = line.split(':');
    const content = contentParts.join(':');
    const parsedContent = JSON.parse(content);
    
    switch (typeId) {
      case '0': // 文本增量
        console.log('Text:', parsedContent);
        break;
      case '3': // 错误
        console.error('Error:', parsedContent);
        break;
      case '9': // 工具调用
        console.log('Tool call:', parsedContent);
        break;
      case 'a': // 工具结果
        console.log('Tool result:', parsedContent);
        break;
      case 'd': // 完成
        console.log('Finished:', parsedContent);
        break;
    }
  }
}
```

## 优势

1. **兼容性**: 完全兼容 AI SDK 的 `fullStream` 类型
2. **类型安全**: 支持 TypeScript 类型推断
3. **标准化**: 使用 AI SDK 标准数据流协议
4. **工具支持**: 支持工具调用和结果流式传输
5. **错误处理**: 内置错误处理机制

## 注意事项

1. 确保设置正确的响应头，特别是 `x-vercel-ai-data-stream: v1`
2. 数据格式必须严格遵循 `TYPE_ID:CONTENT_JSON\n` 格式
3. 工具调用和结果需要包含 `toolCallId` 用于关联
4. 完成事件必须包含 `finishReason` 和 `usage` 信息

## 相关链接

- [AI SDK Stream Protocols](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)
- [AI SDK streamText Documentation](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK useChat Hook](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) 
