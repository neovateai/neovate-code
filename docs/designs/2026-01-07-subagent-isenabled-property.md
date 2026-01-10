# SubAgent isEnabled 属性

**Date:** 2026-01-07

## Context
目前的 SubAgent 系统缺乏一种机制来灵活地启用或禁用特定的 Agent。为了增强系统的可配置性和灵活性，参考现有的 Slash Command 系统，计划为 SubAgent 增加 `isEnabled` 属性。

## Discussion
在设计过程中，讨论了以下关键点：
1.  **控制源 (Control Source)**：确定 `isEnabled` 属性应在 Agent 定义时（如 `src/agent/builtin` 代码中）直接指定，而不是仅依赖外部配置文件。
2.  **功能性 (Functionality)**：需要同时支持静态的布尔值（`boolean`）和动态的逻辑判断（`function`）。这意味着某些 Agent 可以基于当前的运行环境（Context）动态决定是否可用。

## Approach
最终方案是在 `AgentDefinition` 接口中添加 `isEnabled` 字段，并在核心的 `AgentManager` 中统一处理该字段的逻辑判断。

-   默认情况下，如果未定义 `isEnabled`，Agent 视为启用（`true`）。
-   如果是布尔值，直接使用该值。
-   如果是函数，则传入当前的 `Context` 执行并获取结果。

## Architecture

### 1. 接口变更 (`src/agent/types.ts`)
更新 `AgentDefinition` 接口，增加 `isEnabled` 属性：

```typescript
export interface AgentDefinition {
  agentType: string;
  // ... 现有属性
  
  /**
   * 控制 agent 是否可用。
   * - boolean: 静态开关 (默认为 true)
   * - function: 基于上下文的动态检查
   */
  isEnabled?: boolean | ((context: Context) => boolean);
}
```

### 2. 逻辑实现 (`src/agent/agentManager.ts`)
`AgentManager` 将集中管理 Agent 的启用状态：

*   **新增辅助方法**: `isAgentEnabled(agent: AgentDefinition): boolean`
    *   检查 `isEnabled` 类型并计算结果。
*   **过滤逻辑**:
    *   `getAllAgents()`: 调用时自动过滤掉禁用的 Agent。
    *   `getAgent(type)`: 获取特定 Agent 时，如果该 Agent 被禁用，则返回 `undefined`（模拟不存在）。
    *   `executeTask()`: 依赖 `getAgent` 的行为，若 Agent 被禁用将无法执行任务。
