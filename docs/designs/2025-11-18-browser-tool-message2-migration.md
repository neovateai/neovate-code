# Browser 端 ToolMessage2 协议迁移

**Date:** 2025-11-18

## Context

协议层面进行了调整，tool 相关的消息格式从旧的 `ToolMessage`（role: 'user'）升级为新的 `ToolMessage2`（role: 'tool'）。具体变化包括：

1. **ToolMessage2**: `role` 从 `'user'` 改为 `'tool'`
2. **ToolResultPart2**: 
   - 字段 `id` 改为 `toolCallId`
   - 字段 `name` 改为 `toolName`
   - 字段 `type` 从 `'tool_result'` 改为 `'tool-result'`

`src/ui/Messages.tsx` 已经完成了对新协议的适配，包括在 `splitMessages` 和 `pairToolsWithResults` 函数中同时支持新旧格式。现在需要将 Browser 端（`browser/src/state/chat.ts`）迁移到新协议，以保证渲染逻辑正常工作。

## Discussion

### 关键决策点

**1. 新旧协议兼容性策略**
- 选项 A: 完全移除旧格式支持，全部使用新格式 ✅
- 选项 B: 同时支持新旧两种格式
- 选项 C: 主要使用新格式，保留旧格式读取能力

**最终选择**: 选项 A - 完全移除旧格式支持，后端已发送新格式消息。

**2. 后端消息格式**
- 确认：后端已经发送 `ToolMessage2` 新格式
- Browser 端需要适配接收和处理新格式消息

**3. 类型定义策略**
- 选项 A: 在 `browser/src/types/chat.ts` 中新增类型定义 ✅
- 选项 B: 从 `src/message.ts` 导入
- 选项 C: 不显式定义类型

**最终选择**: 选项 A - 保持 Browser 端类型的独立性

### 探索的方案

**方案 A：渐进式转换（转换层方案）** ✅
- 在接收消息时，将 `ToolMessage2` 转换为现有的 `UIAssistantMessage` 格式
- UI 层完全不变，继续使用 `UIToolPart`
- 优势：改动范围小，风险低
- 劣势：存在一个转换层

**方案 B：原生处理（直接适配方案）**
- `chat.ts` 直接处理 `ToolMessage2`，内部维护工具配对逻辑
- 优势：逻辑集中
- 劣势：与 `formatMessages` 存在重复逻辑

**方案 C：统一抽象（工具管理器方案）**
- 创建 `ToolMessageManager` 类处理所有 tool 相关逻辑
- 优势：逻辑清晰，可测试性强
- 劣势：改动最大，需要新增文件

**最终选择**: 方案 A - 最稳妥，改动最小

## Approach

采用渐进式转换方案，核心思路是：

1. **类型层面**：新增 `ToolMessage2` 和 `ToolResultPart2` 类型定义
2. **转换层面**：提供 `toolResultPart2ToToolResultPart` 转换函数
3. **处理层面**：在 `formatMessages` 和 `handleMessage` 中统一处理新格式
4. **UI 层面**：保持现有 `UIToolPart` 不变，无需修改渲染逻辑

通过这种方式，新协议的处理逻辑被封装在数据转换层，UI 组件完全无感知，降低了变更风险。

## Architecture

### 1. 类型定义（`browser/src/types/chat.ts`）

```typescript
// 新增类型
export type ToolResultPart2 = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  input: Record<string, any>;
  result: ToolResult;
};

export type ToolMessage2 = {
  role: 'tool';
  content: ToolResultPart2[];
};

// 更新 Message 联合类型
export type Message =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage2;
```

### 2. 消息转换（`browser/src/utils/message.ts`）

**新增转换函数**：
```typescript
export function toolResultPart2ToToolResultPart(
  part: ToolResultPart2,
): ToolResultPart {
  return {
    type: 'tool_result',
    id: part.toolCallId,
    name: part.toolName,
    input: part.input,
    result: part.result,
  };
}
```

**更新 `formatMessages` 函数**：
- 移除 `isToolResultMessage` 函数及其调用
- 新增对 `role === 'tool'` 的处理分支
- 支持一个 `ToolMessage2` 包含多个 tool results
- 移除所有旧格式处理逻辑

核心处理逻辑：
```typescript
if (message.role === 'tool') {
  const lastMessage = formattedMessages[formattedMessages.length - 1] as UIAssistantMessage;
  const toolMessage = message as ToolMessage2;
  
  toolMessage.content.forEach((toolRes {
    const toolResult = toolResultPart2ToToolResultPart(toolResultPart2);
    // 更新 lastMessage 中对应的 tool_use 为 tool_result
  });
}
```

### 3. 实时消息处理（`browser/src/state/chat.ts`）

**更新 `handleMessage` 函数**：
- 与 `formatMessages` 保持一致的处理逻辑
- 移除对 `isToolResultMessage` 的调用
- 新增 `ToolMessage2` 和 `toolResultPart2ToToolResultPart` 导入

**处理流程**：
1. Assistant 消息包含 `tool_use` → 转换为 `UIToolPart`（state: 'tool_use'）
2. 接收到 `ToolMessage2` → 找到上一条 assistant 消息
3. 遍历 tool results → 转换格式并更新对应的 `UIToolPart`（state: 'tool_result'）

### 4. 数据流

```
后端发送消息
    ↓
ToolMessage2 (role: 'tool', ToolResultPart2[])
    ↓
handleMessage / formatMessages
    ↓
toolResultPart2ToToolResultPart 转换
    ↓
更新 UIAssistantMessage 中的 UIToolPart
    ↓
UI 组件渲染（无需修改）
```

### 5. 完整改动清单

| 文件 | 改动内容 |
|------|---------|
| `browser/src/types/chat.ts` | • 新增 `ToolResultPart2` 和 `ToolMessage2` 类型<br>• 更新 `Message` 联合类型<br>• 移除 `ToolUseMessage` 类型 |
| `browser/src/utils/message.ts` | • 新增 `toolResultPart2ToToolResultPart` 转换函数<br>• 移除 `isToolResultMessage` 函数<br>• 更新 `formatMessages` 处理 `ToolMessage2`<br>• 移除所有旧格式处理逻辑 |
| `browser/src/state/chat.ts` | • 更新 `handleMessage` 处理 `ToolMessage2`<br>• 移除 `isToolResultMessage` 调用<br>• 新增必要的类型和函数导入 |

### 6. 测试要点

- ✅ Assistant 发送 tool_use 后，能正确显示工具调用
- ✅ 接收到 ToolMessage2 后，能正确配对并显示结果
- ✅ 一个 ToolMessage2 包含多个 tool results 时，能正确处理所有结果
- ✅ UI 渲染保持不变（DiffViewer、TodoList 等特殊渲染组件）
- ✅ 错误处理：ToolMessage2 必须在 assistant 消息之后

### 7. 注意
1. **消息顺序依赖**：ToolMessage2 必须紧跟在包含对应 tool_use 的 assistant 消息之后
2. **多结果支持**：一个 ToolMessage2 可能包含多个 tool results，需要遍历处理
3. **状态管理**：使用 `state: 'tool_use'` 和 `state: 'tool_result'` 区分工具的不同阶段
4. **向后兼容**：旧格式类型保留在类型定义中，但代码逻辑中不再处理
