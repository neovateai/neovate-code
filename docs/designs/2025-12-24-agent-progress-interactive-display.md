# SubAgent 交互式进度展示

**日期:** 2025-12-24

## Context

当前 `src/tools/task.ts` 工具在执行 SubAgent 时缺乏实时进度反馈，用户体验不佳。用户希望参考已有的设计文档（`2025-12-10-sub-agent-progress-display.md`），实现类似 Claude Code 的交互式展示：

1. **实时进度**：在 SubAgent 执行过程中实时展示工具调用进度
2. **交互式展开/折叠**：支持 `ctrl+o` 快捷键切换详细信息显示
3. **状态可视化**：
   - 执行中状态（黄色边框）
   - 执行失败状态（红色提示）
   - 执行完成状态（绿色提示，折叠显示摘要）

**现有基础**：
- ✅ `task.ts` 已通过 `messageBus.emitEvent('agent.progress', ...)` 发送进度事件
- ✅ 事件包含 `agentId`、`message`、`parentToolUseId` 等关键信息
- ⚠️ UI 层缺少事件监听和状态管理
- ⚠️ 缺少专门的 SubAgent 进度展示组件

## Discussion

### 关键决策

**1. 数据存储策略**

经讨论，选择了**纯内存存储**方案：
- 进度数据只保存在 `appStore`（内存）中，重启后丢失
- **优势**：性能好、实现简单、无额外 I/O
- **适用场景**：实时展示，不需要历史回放

**备选方案**：
- 持久化存储：数据写入 session.jsonl，支持历史回放，但会污染 LLM 上下文
- 混合模式：实时数据存内存，完成后保存摘要，实现复杂度高

**2. 组件架构**

选择了**独立组件文件夹**架构：
- 在 `src/ui/AgentProgress/` 下创建独立组件文件
- 职责清晰、易维护

**备选方案**：
- 嵌入 Messages.tsx：减少文件数，但会让 Messages.tsx 更复杂
- 单独的 AgentProgress.tsx：适合中等规模，便于统一管理

**3. 快捷键处理**

选择了**全局快捷键管理**方案：
- 在 `App.tsx` 中添加全局 `useInput` hook 监听 `ctrl+o`
- 通过 Zustand store 统一管理展开/折叠状态
- 支持多个 SubAgent 的焦点切换

**备选方案**：
- 组件内部处理：每个组件独立监听，但需要额外的焦点管理机制

### 技术方案对比

**方案 A：基于 toolUseId 的索引方案**（最终选择）
- Store 中使用 `agentProgressMap: Record<string, AgentProgressState>` 按 `parentToolUseId` 索引
- 查询性能 O(1)，支持并发多个 SubAgent
- 需要手动清理内存（完成后可选择性删除）

**方案 B：基于 agentId 的懒加载方案**
- 只保存当前展开的 agent 消息
- 其他数据从 `agent-{agentId}.jsonl` 按需加载
- 内存占用小，但实时性差，不符合核心需求

**方案 C：混合方案**
- 执行中使用方案 A，完成后使用方案 B
- 平衡性能和内存，但实现复杂度高

## Approach

采用**方案 A（基于 toolUseId 索引）**，核心流程：

```
SubAgent 产生消息 
  → task.ts 发送事件 (含 parentToolUseId)
  → store 监听 agent.progress
  → 更新 agentProgressMap[parentToolUseId]
  → React 自动重新渲染
  → 用户按 ctrl+o
  → store.toggleAgentExpanded()
  → 组件读取 agentExpandedMap 展示不同 UI
```

**核心优势**：
- ✅ 查询性能极高（O(1) 直接索引）
- ✅ 支持并发多个 SubAgent
- ✅ 组件实现简单，无需额外查询
- ✅ 完全基于 React 和 Zustand，无浏览器依赖

## Architecture

### 数据结构

**Store 状态扩展** (`src/ui/store.ts`)：

```typescript
// 新增类型定义
export interface AgentProgressState {
  agentId: string;
  agentType: string;
  prompt: string;
  messages: NormalizedMessage[];  // 实时累积的消息
  status: 'running' | 'completed' | 'failed';
  lastUpdate: number;  // 时间戳，用于触发 React 渲染
}

// 在 AppState 中新增字段
interface AppState {
  // 按 parentToolUseId 索引的进度数据
  agentProgressMap: Record<string, AgentProgressState>;
  
  // 记录每个 agent 的展开状态
  agentExpandedMap: Record<string, boolean>;
  
  // 当前聚焦的 agent（用于快捷键控制）
  focusedAgentToolUseId: string | null;
}

// 在 AppActions 中新增方法
interface AppActions {
  updateAgentProgress: (data: {
    parentToolUseId: string;
    agentId: string;
    agentType: string;
    prompt: string;
    message: NormalizedMessage;
    status: 'running' | 'completed' | 'failed';
  }) => void;
  
  clearAgentProgress: (toolUseId: string) => void;
  setFocusedAgent: (toolUseId: string | null) => void;
  toggleAgentExpanded: (toolUseId: string) => void;
  setAgentExpanded: (toolUseId: string, expanded: boolean) => void;
}
```

**关键设计点**：
- `agentProgressMap` 使用 `parentToolUseId` 作为 key（UI 层渲染工具调用的唯一标识）
- `messages` 数组按时间顺序追加，避免排序开销
- `agentExpandedMap` 单独管理展开状态，支持跨组件共享
- `lastUpdate` 时间戳确保 Zustand 触发重新渲染

### 事件监听与状态更新

**在 `store.ts` 的 `initialize` 方法中添加**：

```typescript
initialize: async (opts) => {
  const { bridge } = opts;
  
  // 监听 SubAgent 进度事件
  bridge.onEvent('agent.progress', (data) => {
    const {
      parentToolUseId,
      agentId,
      agentType,
      prompt,
      message,
      status,
    } = data;
    
    get().updateAgentProgress({
      parentToolUseId,
      agentId,
      agentType,
      prompt,
      message,
      status,
    });
  });
},
```

**实现 actions**：

```typescript
updateAgentProgress: (data) => {
  const { parentToolUseId, agentId, agentType, prompt, message, status } = data;
  const { agentProgressMap } = get();
  
  const existing = agentProgressMap[parentToolUseId];
  
  set({
    agentProgressMap: {
      ...agentProgressMap,
      [parentToolUseId]: {
        agentId,
        agentType,
        prompt,
        messages: existing 
          ? [...existing.messages, message]
          : [message],
        status,
        lastUpdate: Date.now(),
      },
    },
  });
},

toggleAgentExpanded: (toolUseId) => {
  const { agentExpandedMap } = get();
  set({
    agentExpandedMap: {
      ...agentExpandedMap,
      [toolUseId]: !agentExpandedMap[toolUseId],
    },
  });
},
```

### 组件架构

**文件结构** (`src/ui/AgentProgress/`)：

```
src/ui/AgentProgress/
├── index.tsx              # 主入口，根据状态路由到不同组件
├── InProgress.tsx         # 执行中状态渲染
├── Completed.tsx          # 完成状态渲染
├── Failed.tsx             # 失败状态渲染
├── NestedMessage.tsx      # 嵌套消息渲染（user/assistant/tool）
├── types.ts               # 组件相关类型定义
└── utils.ts               # 工具函数（统计、格式化等）
```

**主入口组件** (`index.tsx`)：

```typescript
export function AgentProgress({ toolUse }: AgentProgressProps) {
  const { agentProgressMap } = useAppStore();
  const progressData = agentProgressMap[toolUse.id];
  
  if (!progressData) {
    return <Text color="gray">Starting agent...</Text>;
  }
  
  const { status } = progressData;
  
  if (status === 'running') {
    return <InProgress toolUse={toolUse} progressData={progressData} />;
  }
  
  if (status === 'failed') {
    return <Failed toolUse={toolUse} progressData={progressData} />;
  }
  
  if (status === 'completed') {
    return <Completed toolUse={toolUse} progressData={progressData} />;
  }
  
  return null;
}
```

**集成到 Messages.tsx**：

```typescript
import { AgentProgress } from './AgentProgress';
import { TOOL_NAMES } from '../constants';

function renderToolUse(toolUse: ToolUsePart) {
  // 如果是 Task tool，使用 AgentProgress 组件
  if (toolUse.name === TOOL_NAMES.TASK) {
    return <AgentProgress key={toolUse.id} toolUse={toolUse} />;
  }
  
  // 其他工具的正常渲染
  return <NormalToolUse key={toolUse.id} toolUse={toolUse} />;
}
```

### 核心组件实现

**InProgress 组件**（执行中状态）：

```typescript
export function InProgress({ toolUse, progressData }: InProgressProps) {
  const { 
    agentExpandedMap, 
    setAgentExpanded, 
    setFocusedAgent 
  } = useAppStore();
  
  const expanded = agentExpandedMap[toolUse.id] || false;
  const { messages, agentType } = progressData;
  
  // 组件挂载时设置为当前聚焦的 agent
  React.useEffect(() => {
    setFocusedAgent(toolUse.id);
    return () => setFocusedAgent(null);
  }, [toolUse.id, setFocusedAgent]);
  
  const stats = useMemo(() => calculateStats(messages), [messages]);
  
  // 智能截断：默认只显示最后 3 条
  const VISIBLE_LIMIT = 3;
  const visibleMessages = expanded 
    ? messages 
    : messages.slice(-VISIBLE_LIMIT);
  const hiddenCount = messages.length - visibleMessages.length;
  
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow">
      <Box>
        <Text color="yellow" bold>╭─ Agent: {agentType}</Text>
        {toolUse.input?.description && (
          <Text color="gray" dimColor> ({toolUse.input.description})</Text>
        )}
      </Box>
      
      <Box flexDirection="column" paddingLeft={1}>
        {!expanded && hiddenCount > 0 && (
          <Text color="gray" dimColor>+{hiddenCount} more tool uses</Text>
        )}
        
        {visibleMessages.map((msg, idx) => (
          <NestedMessage key={idx} message={msg} />
        ))}
      </Box>
      
      <Box paddingLeft={1}>
        <Text color="yellow">
          In progress... · {stats.toolCalls} tool uses · {stats.tokens} tokens
        </Text>
      </Box>
      
      <Box>
        <Text color="yellow">╰─────────────────────────────</Text>
        <Text color="gray" dimColor>
          {' '}(ctrl+o to {expanded ? 'collapse' : 'expand'})
        </Text>
      </Box>
    </Box>
  );
}
```

**关键特性**：
- 使用 `useMemo` 缓存统计计算，避免每次渲染都重新计算
- 智能截断只在非展开状态生效
- 黄色边框表示执行中，视觉上醒目
- 自动设置为当前聚焦的 agent，支持快捷键控制

**Completed 组件**（完成状态）：

```typescript
export function Completed({ toolUse, progressData }: CompletedProps) {
  const { agentExpandedMap, setAgentExpanded } = useAppStore();
  const expanded = agentExpandedMap[toolUse.id] || false;
  
  const { messages, agentType } = progressData;
  const stats = useMemo(() => calculateStats(messages), [messages]);
  
  return (
    <Box flexDirection="column">
      {/* 折叠状态：只显示摘要 */}
      {!expanded && (
        <Box>
          <Text color="green">✓ </Text>
          <Text color="cyan" bold>{agentType}</Text>
          {toolUse.input?.description && (
            <Text color="gray"> ({toolUse.input.description})</Text>
          )}
          <Text color="gray" dimColor>
            {' '}({stats.toolCalls} tool uses · {stats.tokens} tokens)
          </Text>
          <Text color="blue" dimColor>
            {' '}▶ Show details (ctrl+o)
          </Text>
        </Box>
      )}
      
      {/* 展开状态：显示详细内容 */}
      {expanded && (
        <Box flexDirection="column" borderStyle="round" borderColor="green">
          <Box>
            <Text color="green" bold>╭─ Done: {agentType}</Text>
            <Text color="gray" dimColor>
              {' '}({stats.toolCalls} tool uses · {stats.tokens} tokens)
            </Text>
          </Box>
          
          <Box flexDirection="column" paddingLeft={1}>
            {messages.map((msg, idx) => (
              <NestedMessage key={idx} message={msg} />
            ))}
          </Box>
          
          <Box>
            <Text color="green">╰─────────────────────────────</Text>
            <Text color="blue" dimColor>
              {' '}▼ Hide details
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
```

**关键特性**：
- 默认折叠，节省屏幕空间
- 绿色边框表示成功完成
- 支持点击或快捷键展开详情

### 全局快捷键处理

**在 `App.tsx` 中添加**：

```typescript
function App() {
  const { 
    focusedAgentToolUseId, 
    toggleAgentExpanded 
  } = useAppStore();
  
  // 全局快捷键监听
  useInput((input, key) => {
    // ctrl+o: 切换当前聚焦的 SubAgent 展开/折叠
    if (key.ctrl && input === 'o') {
      if (focusedAgentToolUseId) {
        toggleAgentExpanded(focusedAgentToolUseId);
      }
    }
  });
  
  // ...其他逻辑
}
```

**工作原理**：
1. `InProgress` 组件挂载时自动设置 `focusedAgentToolUseId`
2. 用户按 `ctrl+o` 触发全局监听器
3. 调用 `toggleAgentExpanded(focusedAgentToolUseId)`
4. Store 更新 `agentExpandedMap`
5. 组件订阅 store 变化，自动重新渲染

### 工具函数

**统计计算** (`utils.ts`)：

```typescript
export function calculateStats(messages: NormalizedMessage[]) {
  let toolCalls = 0;
  let tokens = 0;
  
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      const assistantMsg = msg as AssistantMessage;
      
      // 统计工具调用
      if (Array.isArray(assistantMsg.content)) {
        toolCalls += assistantMsg.content.filter(p => p.type === 'tool_use').length;
      }
      
      // 统计 tokens
      if ('usage' in assistantMsg && assistantMsg.usage) {
        tokens += assistantMsg.usage.input_tokens + assistantMsg.usage.output_tokens;
      }
    }
  }
  
  return { toolCalls, tokens };
}

export functionration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}
```

## Implementation Plan

### 文件清单

**修改：**
1. `src/ui 新增状态和 actions
2. `src/ui/Messages.tsx` - 集成 AgentProgress 组件
3. `src/ui/App.tsx` - 添加全局快捷键

**新建：**rc/ui/AgentProgress/index.tsx` - 主入口组件
5. `src/ui/AgentProgress/InProgress.tsx` - 执行中状态
6. `src/ui/AgentProgress/Completed.tsx` - 完成状态
7. `src/ui/AgentProgress/Failed.tsx` - 失败状态
8. `src/ui/AgentProgress/NestedMessage.tsx` - 嵌套消息渲染
9. AgentProgress/utils.ts` - 工具函数
10. `src/ui/AgentProgress/types.ts` - 类型定义（可选）

### 实现优先级

**P0（核心功能）：**
- Store 状态扩展与事件监听
- s 组件（执行中状态）
- Messages.tsx 集成
- 全局快捷键

**P1（完整体验）：**
- Completed 组件
- Failed 组件
- NestedMessage 组件

**P2（优化）：**
- 存清理策略
- 样式美化

### 技术要点

**性能优化**：
- 使用 `useMemo` 缓存统计计算
- 智能截断（默认只显示最后 3 条消息）
- 按需更新（只更新变化的 agent）

**内存管 可选择性保留最近 N 个完成的 agent（如最近 5 个）
- 或在用户点击 "Hide details" 时清理
- 或在新会话开始时批量清理

**状态同步**：
- 所有状态通过 Zustand s致性
- 组件通过 `useAppStore` hook 订阅，自动响应变化
- 无需手动触发渲染

## References

- 原始需求文档：`2025-12-10-sub-agent-progress-display.md`
- 现有实现：`src/tools/task.ts` 已发送 `agent.progress` 事件
- UI 框架：基于 Ink (React for CLI) + Zustand
