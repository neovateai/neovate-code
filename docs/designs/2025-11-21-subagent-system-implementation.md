# Subagent 系统完整实现

**Date:** 2025-11-21

## Context

本设计旨在为 neovate-code 项目实现完整的 subagent（子代理）技术方案，参考 Claude Code 的 Explore Subagent 和 Task Tool 实现。目标是让主 Agent 能够将复杂的多步骤任务委托给专门的子 Agent 处理，每个子 Agent 具有特定的能力和工具访问权限。

核心需求：
- 优先实现 Explore 和 Plan 两个核心子代理
- 建立完整的 Agent 系统架构（而非简单集成）

## Discussion

### Phase 1: 理解需求

**关键决策：实现范围**
- 选择方案 A（完整复刻）而非轻量实现或定制化方案
- 优先实现 Explore + Plan 子代理，跳过 General-Purpose 和 Statusline-Setup

**技术基础评估**
- 现有工具系统部分完成：已有统一的 Tool 接口和基础工具实现
- 缺少：工具权限过滤机制、子代理调用机制、上下文 Fork 机制

### Phase 2: 方案探索

评估了三个方案后选择 **方案 B（标准 Agent 系统方案）**：

**方案对比**：
- 方案 A（轻量集成）：改动小但扩展性弱
- **方案 B（标准 Agent 系统）**：架构清晰，完全对标 Claude Code ✓
- 方案 C（渐进式混合）：风险可控但总周期长

**选择理由**：
1. 一次到位，避免反复重构
2. 架构优雅，符合"完整复刻"目标
3. 可维护性好，便于后续扩展
4. 长期收益最高

### Phase 3: 设计细化

**关键设计点**：

1. **工具名称规范**
   - Task 工具名称：`task`（小写）
   - 编辑工具：`edit`, `write`（小写）

2. **模型配置策略**
   - 采用工厂函数模式传入 context
   - Explore Agent: `context.config.smallModel || context.config.model`
   - Plan Agent: `context.config.planModel`

3. **上下文 Fork 优化**
   - 参考 `normalizeMessagesForCompact` 处理工具消息
   - 智能过滤不支持的工具调用，转换为摘要
   - 避免子 Agent 看到不可用工具的消息

## Approach

### 核心架构

采用标准的 Agent 系统架构，建立清晰的分层设计：

```
src/
  agent/
    index.ts              # AgentManager - 注册和调用入口
    types.ts              # 类型定义
    executor.ts           # AgentExecutor - 执行引擎
    toolFilter.ts         # ToolFilter - 工具权限过滤
    contextFork.ts        # ContextFork - 上下文继承
    builtin/
      index.ts            # 内置 Agent 导出
      explore.ts          # Explore Agent 工厂函数
      plan.ts             # Plan Agent 工厂函数
      common.ts           # 公共配置
  tools/
    task.ts               # Task 工具实现
```

### 数据流

```
用户输入
  ↓
runLoop (主 Agent)
  ↓
调用 Task 工具
  ↓
AgentManager.executeTask()
  ↓
├─ 查找 Agent 定义
├─ 过滤工具权限 (ToolFilter)
├─ Fork 上下文 (ContextFork, 可选)
└─ 执行子 Agent (AgentExecutor)
     ↓
   runLoop (isSubAgent=true)
     ↓
   返回结果
```

### 关键技术点

1. **工具权限过滤**
   - 支持通配符 `["*"]` 表示所有工具
   - `disallowedTools` 优先级高于 `tools`
   - 静态方法设计，无状态，易测试

2. **上下文 Fork 机制**
   - 过滤孤立的 tool_use（没有对应 tool_result）
   - 将不支持的工具调用转换为摘要
   - 添加明确的上下文分隔标记

3. **工厂函数模式**
   - Agent 定义使用工厂函数：`createExploreAgent(opts)`
   - 通过 `opts: { context: Context }` 传入上下文
   - 在函数内部访问 `context.config.smallModel` 等配置

## Architecture

### 1. 类型系统 (`src/agent/types.ts`)

```typescript
export interface AgentDefinition {
  agentType: string;
  whenToUse: string;
  systemPrompt: string;
  model: string;
  source: 'built-in' | 'plugin' | 'user';
  tools?: string[];
  disallowedTools?: string[];
  forkContext?: boolean;
  color?: string;
}

export interface TaskToolInput {
  description: string;
  prompt: string;
  subagent_type: string;
  model?: string;
  resume?: string;
}

export interface AgentExecutionResult {
  status: 'completed' | 'failed';
  agentId: string;
  content: string;
  totalToolCalls: number;
  totalDuration: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}
```

### 2. 工具过滤系统 (`src/agent/toolFilter.ts`)

**核心逻辑**：
- 构建禁用工具集合
- 处理通配符（未定义 tools 或 `["*"]`）
- 显式工具列表处理
- disallowedTools 优先过滤

**关键方法**：
```typescript
static filterTools(allTools: Tool[], agentDef: AgentDefinition): Tool[]
```

### 3. 上下文 Fork (`src/agent/contextFork.ts`)

**核心功能**：
1. `prepareForkMessages()`: 准备 fork 的上下文消息
2. `normalizeMessagesForSubAgent()`: 规范化父级消息
   - 过滤 assistant 消息中不支持的 tool_use
   - 转换 tool 消息中不支持的工具结果为摘要
   - 混合处理：支持的保留，不支持的摘要
3. `buildContextSeparatorMessage()`: 构建上下文分隔标记

**消息处理策略**：
- Assistant 消息：保留 text/reasoning，过滤不支持的 tool_use
- Tool 消息：支持的保留原样，不支持的转为 user 消息摘要
- 添加明确的工具列表说明

### 4. Agent 执行引擎 (`src/agent/executor.ts`)

**执行流程**：
1. 验证 Agent 定义
2. 过滤工具（ToolFilter）
3. 准备消息（ContextFork 或简单消息）
4. 解析模型（优先级：调用时指定 > Agent 定义）
5. 执行 runLoop（标记 isSubAgent=true）
6. 处理结果和错误

**错误处理**：
- 工具过滤后为空 → 抛出友好错误
- 模型未指定 → 验证并抛出错误
- 所有异常 → 捕获并返回失败结果（不抛出）

### 5. Agent 管理器 (`src/agent/index.ts`)

**职责**：
- 注册和管理所有 Agent
- 查找 Agent 定义
- 执行 Task 工具调用
- 提供 Agent 描述（用于系统提示）

**关键方法**：
```typescript
constructor(opts: { context: Context })
registerAgent(definition: AgentDefinition)
getAgent(agentType: string): AgentDefinition | undefined
executeTask(input: TaskToolInput, context: {...}): Promise<AgentExecutionResult>
```

### 6. 内置 Agent 定义

**Explore Agent** (`src/agent/builtin/explore.ts`):
```typescript
export function createExploreAgent(opts: { context: Context }): AgentDefinition {
  return {
    agentType: 'Explore',
    model: context.config.smallModel || context.config.model,
    disallowedTools: ['task', 'edit', 'write'],
    forkContext: false,
    color: 'blue',
    // ...
  };
}
```

**特点**：
- 快速模型（smallModel）
- 只读工具（禁用 edit/write）
- 禁用 task 工具（防止递归）
- 支持彻底性级别（quick/medium/very thorough）

**Plan Agent** (`src/agent/builtin/plan.ts`):
```typescript
export function createPlanAgent(opts: { context: Context }): AgentDefinition {
  return {
    agentType: 'Plan',
    model: context.config.planModel,
    disallowedTools: ['task', 'edit', 'write'],
    forkContext: false,
    color: 'purple',
    // ...
  };
}
```

**特点**：
- 强大模型（planModel）
- 深度分析和规划能力
- 相同的工具限制（只读 + 禁止递归）

### 7. Task 工具 (`src/tools/task.ts`)

**Schema 定义**（严格对标 Claude Code）：
```typescript
{
  name: 'task',
  description: 'Launch a new agent to handle complex, multi-step tasks autonomously',
  parameters: {
    description: 'A short (3-5 word) description of the task',
    prompt: 'The task for the agent to perform',
    subagent_type: 'The type of specialized agent to use for this task',
    model: 'Optional model to use...',
    resume: 'Optional agent ID to resume from...',
  }
}
```

**执行逻辑**：
1. 获取当前对话历史（forkContext）
2. 调用 `agentManager.executeTask()`
3. 格式化返回结果（包含 Agent ID、工具调用次数、耗时等）

**批准机制**：
- category: 'command'
- yolo 模式：无需批准
- 其他模式：需要用户批准

### 8. 系统集成

**扩展 `src/tool.ts`**：
- 添加 `agentManager` 和 `getCurrentMessages` 可选参数
- 条件性创建 Task 工具

**扩展 `src/context.ts`**：
- 添加 `agentManager: AgentManager` 属性
- 在 `create()` 方法中初始化 AgentManager

**扩展 `src/loop.ts`**：
- 添加 `isSubAgent?: boolean` 参数
- 用于日志区分主/子 Agent（可选）

### 9. 测试策略

**核心测试用例**：

1. **ToolFilter 测试**
   - 验证 disallowedTools 过滤功能

2. **ContextFork 测试**
   - 验证上下文分隔符和任务消息添加

3. **集成测试**
   - 验证内置 Agent 正确注册
   - 验证 Agent 类型和配置

**测试目标**：确保主流程正常工作，无需覆盖所有边界情况。

## Implementation Notes

### 配置文件支持

用户可以在配置文件中设置 subagent 使用的模型：

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "planModel": "claude-3-5-sonnet-20241022",
  "smallModel": "claude-3-5-haiku-20241022"
}
```

### 使用场景

**✅ 应该使用 Task 工具**：
- 需要多轮搜索和探索的开放式任务
- 不确定第一次尝试就能找到正确结果
- 需要专门的快速搜索能力（Explore）
- 需要深度架构分析（Plan）

**❌ 不应该使用 Task 工具**：
- 读取已知的特定文件 → 直接使用 read 工具
- 搜索特定的类/函数名 → 直接使用 grep 工具
- 在 2-3 个已知文件中搜索 → 直接使用 grep 工具

### 扩展性

未来可以支持：
- 自定义 Agent 注册（通过 `agentManager.registerAgent()`）
- Agent 优先级系统（类似 Claude Code 的 source 优先级）
- 插件系统集成
- 异步执行（background execution）

## References

- `explore-subagent-analysis.md`: Claude Code 的 Explore Subagent 技术实现详解
- `Task-Tool-Analysis.md`: Claude Code Task Tool 技术实现分析
- `src/utils/messageNormalization.ts`: 消息规范化参考实现
- `src/slash-commands/builtin/init.ts`: 工厂函数模式参考

## Next Steps

1. 实现核心类型定义 (`src/agent/types.ts`)
2. 实现工具过滤系统 (`src/agent/toolFilter.ts`)
3. 实现上下文 Fork 机制 (`src/agent/contextFork.ts`)
4. 实现 Agent 执行引擎 (`src/agent/executor.ts`)
5. 实现 Agent 管理器 (`src/agent/index.ts`)
6. 实现内置 Agent (`src/agent/builtin/`)
7. 实现 Task 工具 (`src/tools/task.ts`)
8. 集成到现有系统 (`tool.ts`, `context.ts`, `loop.ts`)
9. 编写核心测试用例
10. 更新文档 (`AGENTS.md`, 用户指南)
