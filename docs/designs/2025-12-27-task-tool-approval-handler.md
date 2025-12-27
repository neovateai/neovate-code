# Task Tool Approval Handler 设计文档

**Date:** 2025-12-27

## Context

当前 task tool 在执行 agent 时缺少工具审批功能。`src/nodeBridge.ts` 中的 `session.send` 已经通过 `onToolApprove` 处理实现了完整的工具审批流程，包括：
- 通过 `messageBus.request('toolApproval')` 与 UI 交互
- 支持用户同意/拒绝/修改参数
- 支持多种审批模式（yolo/autoEdit/session config）

需要为 task tool 增加相同的审批能力，使得在 agent 执行过程中也能够：
1. 让用户审批危险操作（如 bash 命令）
2. 修改工具参数
3. 拒绝工具调用并提供原因

同时需要考虑 `src/agent/executor.ts` 中的 `executeAgent` 能否直接复用 `Project.send` 的逻辑，避免重复实现。

## Discussion

### 关键决策

**1. 审批方式选择**
- **决定：** 完全复用 `session.send` 的交互式审批
- **理由：** 与主 session 保持一致的用户体验，避免重复实现审批逻辑

**2. 复用方式选择**
- **决定：** 直接复用 `Project.send`
- **理由：** 
  - `Project.send` 已经封装了完整的工具审批、日志、插件等逻辑
  - 避免在 executeAgent 中重复实现这些能力
  - 代码量可减少约 40%

**3. 实现方案选择**

探索了三种方案：
- **方案 1（最小侵入式）：** 仅在 task tool 层面处理，executeAgent 保持不变
  - ❌ executeAgent 需要创建 session，可能与现有 agent 日志机制冲突
  
- **方案 2（重构式）：** executeAgent 直接使用 Project.send
  - ✅ 逻辑最清晰，完全复用 Project 的能力
  - ✅ Agent 和正常会话行为完全一致
  - **最终选择此方案**
  
- **方案 3（混合式）：** executeAgent 接收 onToolApprove，内部使用 Project
  - ⚠️ 需要处理特殊配置

**4. 日志路径处理**
- **问题：** Agent 的日志应该与主 session 分离
- **决定：** 
  - 主 session: `sessions/${sessionId}.jsonl`
  - Agent session: `agents/agent-${agentId}.jsonl`
- **实现：** 为 `Project` 构造函数添加可选的 `logPath` 参数

## Approach

### 核心思路

将 `executeAgent` 从直接调用 `runLoop` 转变为创建 `Project` 实例并调用 `project.sendWithSystemPromptAndTools`，实现以下目标：

1. **审批流程传递链：**
   ```
   用户 UI → messageBus.request('toolApproval')
           ↓
   task tool 包装为 onToolApprove 回调
           ↓
   AgentManager.executeTask 透传
           ↓
   executeAgent 传递给 Project.send
           ↓
   Project.send 内部的 runLoop 执行实际审批
   ```

2. **日志路径隔离：**
   - 通过 `Project` 构造函数的 `logPath` 参数指定 agent 日志路径
   - `executeAgent` 使用 `context.paths.getAgentLogPath(agentId)` 获取路径

3. **完全复用 Project 能力：**
   - 工具审批逻辑（yolo/autoEdit/session config）
   - 消息日志管理（JsonlLogger）
   - 请求日志（RequestLogger）
   - 插件系统（onToolUse/onToolResult hooks）
   - 模型解析（resolveModelWithContext）

### 为什么不需要 llmsContext

Agent 是独立任务，应该基于 prompt 中的明确指令执行，不应依赖父 session 的上下文文件。因此使用 `project.sendWithSystemPromptAndTools` 而不是 `project.send`，跳过 llmsContext 的生成。

## Architecture

### 组件改动

#### 1. `src/project.ts` - 添加 logPath 支持

**修改：** Project 构造函数
```typescript
export class Project {
  constructor(opts: { 
    sessionId?: SessionId; 
    context: Context;
    logPath?: string;  // 新增：允许自定义日志路径
  }) {
    this.session = opts.sessionId
      ? Session.resume({
          id: opts.sessionId,
          logPath: opts.logPath || opts.context.paths.getSessionLogPath(opts.sessionId),
        })
      : Session.create();
    this.context = opts.context;
  }
}
```

**影响：** 向后兼容，现有代码无需修改

---

#### 2. `src/agent/types.ts` - 更新类型定义

**新增字段：**
```typescript
export interface AgentExecuteOptions {
  definition: AgentDefinition;
  prompt: string;
  tools: Tool[];
  context: Context;
  model?: string;
  cwd: string;
  signal?: AbortSignal;
  resume?: string;
  onMessage?: (message: NormalizedMessage, agentId: string) => void | Promise<void>;
  onToolApprove?: (opts: {   // 新增
    toolUse: ToolUse;
    category?: ApprovalCategory;
  }) => Promise<boolean | ToolApprovalResult>;
}
```

---

#### 3. `src/agent/executor.ts` - 核心重构

**移除的代码：**
- ❌ `JsonlLogger` 创建和使用
- ❌ `resolveModelWithContext` 调用
- ❌ `runLoop` 调用及其所有参数配置
- ❌ 手动的 `agentLogger.addMessage` 调用
- ❌ `prepareMessages` 函数
- ❌ `extractFinalContent` 函数

**新的实现：**
```typescript
export async function executeAgent(
  options: AgentExecuteOptions,
): Promise<AgentExecutionResult> {
  const startTime = Date.now();
  const agentId = options.resume || Session.createSessionId();
  const agentLogPath = options.context.paths.getAgentLogPath(agentId);

  try {
    // 1. 验证 definition
    if (!options.definition.agentType) {
      throw new Error('Agent definition must have agentType');
    }
    if (!options.definition.systemPrompt) {
      throw new Error(`Agent '${options.definition.agentType}' must have systemPrompt`);
    }

    // 2. 过滤 tools
    const filteredTools = filterTools(options.tools, options.definition);
    if (filteredTools.length === 0) {
      throw new Error(
        `Agent '${options.definition.agentType}' has no available tools after filtering.`,
      );
    }

    // 3. 解析 model（保持现有逻辑）
    const MODEL_INHERIT = 'inherit';
    let modelName = options.model || options.definition.model;
    if (modelName === MODEL_INHERIT) {
      modelName = options.context.config.model;
    }
    if (!modelName) {
      throw new Error(
        `No model specified for agent '${options.definition.agentType}'`
      );
    }

    // 4. 创建 Project 实例，指定 agent 日志路径
    const project = new Project({
      sessionId: agentId,
      context: options.context,
      logPath: agentLogPath,  // 使用 agent 专用路径
    });

    // 5. 调用 project.sendWithSystemPromptAndTools
    const result = await project.sendWithSystemPromptAndTools(
      options.prompt,
      {
        model: modelName,
        systemPrompt: options.definition.systemPrompt,
        tools: filteredTools,
        signal: options.signal,
        onMessage: async ({ message }) => {
          // 添加 agent metadata
          const enhancedMessage = {
            ...message,
            metadata: {
              ...(message.metadata || {}),
              agentId,
              agentType: options.definition.agentType,
            },
          };
          await options.onMessage?.(enhancedMessage, agentId);
        },
        onToolApprove: options.onToolApprove,  // 直接传递
      },
    );

    // 6. 处理 Project.send 的结果
    if (result.success) {
      return {
        status: 'completed',
        agentId,
        content: result.data.text || 'Agent completed successfully',
        totalToolCalls: result.metadata?.toolCallsCount || 0,
        totalDuration: Date.now() - startTime,
        usage: {
          inputTokens: result.data.usage?.promptTokens || 0,
          outputTokens: result.data.usage?.completionTokens || 0,
        },
      };
    }

    return {
      status: 'failed',
      agentId,
      content: `Agent execution failed: ${result.error.message}`,
      totalToolCalls: 0,
      totalDuration: Date.now() - startTime,
      usage: { inputTokens: 0, outputTokens: 0 },
    };

  } catch (error) {
    return {
      status: 'failed',
      agentId,
      content: `Agent execution error: ${error instanceof Error ? error.message : String(error)}`,
      totalToolCalls: 0,
      totalDuration: Date.now() - startTime,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}
```

**关键改进：**
- 代码量减少约 40%
- 完全复用 Project 的能力
- 逻辑更清晰，易于维护

---

#### 4. `src/agent/agentManager.ts` - 透传 onToolApprove

**修改：** executeTask 方法签名
```typescript
async executeTask(
  input: TaskToolInput,
  context: {
    tools: Tool[];
    cwd: string;
    signal?: AbortSignal;
    onMessage?: (message: NormalizedMessage, agentId: string) => void | Promise<void>;
    onToolApprove?: (opts: {   // 新增
      toolUse: ToolUse;
      category?: ApprovalCategory;
    }) => Promise<boolean | ToolApprovalResult>;
  },
): Promise<AgentExecutionResult> {
  // ... 验证逻辑

  const executeOptions: AgentExecuteOptions = {
    definition,
    prompt: input.prompt,
    tools: context.tools,
    context: this.context,
    model: input.model,
    resume: input.resume,
    cwd: context.cwd,
    signal: context.signal,
    onMessage: context.onMessage,
    onToolApprove: context.onToolApprove,  // 透传
  };

  return executeAgent(executeOptions);
}
```

---

#### 5. `src/tools/task.ts` - 包装 messageBus.request

**新增逻辑：**
```typescript
export function createTaskTool(opts: {
  context: Context;
  tools: Tool[];
  sessionId: string;
  signal?: AbortSignal;
}) {
  const { signal, sessionId } = opts;
  const { cwd, agentManager, messageBus } = opts.context;

  return createTool({
    name: TOOL_NAMES.TASK,
    // ... description, parameters

    execute: async (params, toolCallId?: string) => {
      // ... 验证逻辑

      // 包装 messageBus.request 为 onToolApprove 回调
      const onToolApprove = async (opts: { 
        toolUse: ToolUse; 
        category?: ApprovalCategory;
      }) => {
        if (!messageBus) {
          return true;  // 降级为自动批准
        }
        
        const result = await messageBus.request('toolApproval', {
          toolUse: opts.toolUse,
          category: opts.category,
        });
        
        // 兼容两种返回格式
        if (result.params || result.denyReason) {
          return {
            approved: result.approved,
            params: result.params,
            denyReason: result.denyReason,
          };
        }
        return result.approved;
      };

      const result = await agentManager.executeTask(params, {
        cwd,
        signal,
        tools: opts.tools,
        onMessage,
        onToolApprove,  // 传入回调
      });

      // ... 处理结果
    },
  });
}
```

---

### 数据流

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户在 UI 触发工具审批                                      │
│    messageBus.request('toolApproval', { toolUse, category })│
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. task tool (createTaskTool)                              │
│    将 messageBus.request 包装为 onToolApprove 回调          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AgentManager.executeTask                                │
│    透传 onToolApprove                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. executeAgent                                            │
│    - 创建 Project(agentId, logPath)                        │
│    - 调用 project.sendWithSystemPromptAndTools             │
│    - 传入 onToolApprove                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Project.sendWithSystemPromptAndTools                    │
│    - 调用 runLoop({ onToolApprove })                       │
│    - 处理审批逻辑（yolo/autoEdit/session config）          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. runLoop                                                 │
│    - 工具调用时触发 onToolApprove                           │
│    - 等待用户响应                                           │
│    - 根据审批结果执行或拒绝工具                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 错误处理

**1. 无可用工具**
```typescript
if (filteredTools.length === 0) {
  throw new Error(
    `Agent '${options.definition.agentType}' has no available tools after filtering.`,
  );
}
```
- 立即失败，不创建 Project
- 返回清晰的错误信息

**2. 用户拒绝工具调用**
- `onToolApprove` 返回 `{ approved: false, denyReason: '...' }`
- runLoop 将拒绝信息传递给 LLM
- Agent 可以选择其他方案或报告失败

**3. messageBus 不可用**
```typescript
if (!messageBus) {
  return true;  // 降级为自动批准
}
```
- 在 task tool 中处理
- 避免 agent 执行失败

**4. 用户取消执行（signal.aborted）**
- signal 传递到 Project.send → runLoop
- runLoop 检测到 abort 立即停止
- executeAgent 返回失败状态

**5. Model 未指定**
```typescript
if (!modelName) {
  throw new Error(
    `No model specified for agent '${options.definition.agentType}'`
  );
}
```
- 在解析 'inherit' 之后验证
- 避免传递 undefined 给 Project

---

### 测试策略

#### 单元测试
1. **executeAgent 测试**
   - ✅ 验证 Project 正确创建（sessionId, logPath）
   - ✅ 验证 onToolApprove 正确传递
   - ✅ 验证 model 解析逻辑（inherit/explicit/undefined）
   - ✅ 验证错误处理（无工具/无 model）

2. **AgentManager 测试**
   - ✅ 验证 onToolApprove 透传
   - ✅ 验证未找到 agent 错误处理

3. **task tool 测试**
   - ✅ 验证 messageBus.request 包装
   - ✅ 验证 messageBus 不可用降级
   - ✅ 验证返回格式兼容性

#### 集成测试
1. **完整审批流程**
   - ✅ 用户触发 task tool → agent 调用 bash → 审批弹窗 → 同意 → 执行
   - ✅ 验证日志分离（session vs agent）

2. **拒绝场景**
   - ✅ 用户拒绝工具调用
   - ✅ LLM 收到拒绝信息
   - ✅ Agent 尝试其他方案

3. **参数修改场景**
   - ✅ 用户修改工具参数
   - ✅ 工具使用修改后的参数执行

#### 回归测试
- ✅ 普通 session.send 行为不受影响
- ✅ nodeBridge 审批逻辑保持不变
- ✅ Project 构造函数向后兼容

---

### 预期收益

1. **代码质量**
   - 📉 executeAgent 代码量减少约 40%
   - 🔄 完全复用 Project 的能力（审批、日志、插件）
   - 🎯 审批逻辑统一，维护成本降低

2. **用户体验**
   - ✅ Agent 和主 session 的审批体验一致
   - ✅ 支持所有审批模式（yolo/autoEdit/session config）
   - ✅ 支持参数修改和拒绝原因

3. **可维护性**
   - ✅ 单一职责：Project 处理所有会话逻辑
   - ✅ 清晰的调用链：task tool → AgentManager → executeAgent → Project
   - ✅ 易于测试：可以直接测试 Project 的行为
