# Agent @ Mention File Suggestion 集成

**Date:** 2026-02-09

## Context

当前 FileSuggestion 功能在用户输入 `@` 时只显示文件路径建议。用户希望在 `@` 触发时同时显示可用的 Agent 列表，类似于 Claude Code 的实现，使用户可以快速通过 `@agent-{name}` 语法调用特定的 subagent。

### 目标 UI 效果

```
──────────────────────────────────────────────────────────────
❯ @a
──────────────────────────────────────────────────────────────
  AGENTS.md
  agent-Bash                             Agent: Command execution specialist for running bash c…
  agent-Plan                             Agent: Software architect agent for designing implemen…
  agent-Explore                          Agent: Fast agent specialized for exploring codebases…
```

## Discussion

### 关键决策

1. **前缀格式**: 选择 `agent-{name}` 格式（如 `agent-Bash`, `agent-Plan`），保持与 Claude Code 的一致性

2. **排序策略**: 采用混合排序方案 - agent 和文件建议按相关性统一排序，而非分组显示。这样用户输入关键词时能看到最相关的结果，无论是文件还是 agent

3. **触发条件**: Agent 建议仅在 `@` 触发时显示，Tab 触发的文件补全不包含 agent

### 技术分析

参考 `subagent-implementation-analysis.md` 中对 Claude Code 实现的分析：
- Agent 使用 `@agent-{agentType}` 正则识别
- UI 自动补全使用 Fuse.js 模糊搜索
- agent 项有独立的颜色标识

## Approach

### 核心实现策略

1. **后端**: 新增 `agents.list` NodeBridge handler，从 AgentManager 获取所有启用的 agent

2. **前端**: 扩展现有 FileSuggestion 功能，在 `@` 触发时同时查询文件和 agent，使用 Fuse.js 统一模糊匹配和排序

3. **类型扩展**: 将 suggestion item 扩展为联合类型，支持 `file` 和 `agent` 两种类型

## Architecture

### 1. 新增 NodeBridge Handler

**文件**: `src/nodeBridge/slices/agents.ts` (新建)

```typescript
type AgentsListInput = { cwd: string };
type AgentsListOutput = {
  success: boolean;
  data: {
    agents: Array<{
      agentType: string;
      description: string;
      color?: string;
    }>;
  };
};
```

**实现**: 调用 `context.agentManager.getAllAgents()` 获取所有启用的 agent

### 2. 扩展 Suggestion 类型

**文件**: `src/ui/useFileSuggestion.ts`

```typescript
interface SuggestionItem {
  type: 'file' | 'agent';
  displayText: string;
  description: string;
  // file specific
  path?: string;
  // agent specific
  agentType?: string;
  color?: string;
}
```

### 3. 新增 Agent Suggestion Hook

**文件**: `src/ui/useAgentSuggestion.ts` (新建)

- 仅在 `@` 触发时激活
- 调用 `bridge.request('agents.list')` 获取 agent 列表
- 根据查询词过滤 agent（匹配 agentType 和 description）

### 4. 合并文件和 Agent 建议

**修改**: `src/ui/useFileSuggestion.ts`

- 合并文件和 agent 建议到统一列表
- 使用 Fuse.js 进行模糊匹配，配置权重：
  - `agentType`: 3 (最高)
  - `displayText`: 2
  - `description`: 1
- 按相关性分数排序

### 5. 更新 UI 渲染

**修改**: `src/ui/ChatInput.tsx` 和 `src/ui/Suggestion.tsx`

- Agent 项显示: `agent-{name}` + `Agent: {description}`
- 可选: 使用 agent 配置的 color 属性进行颜色标识

### 6. 处理 Agent 选择

**修改**: `src/ui/useInputHandlers.ts`

当用户选择 agent 时:
- 替换输入为 `@agent-{agentType} `
- 后续发送时，后端识别 `@agent-xxx` 模式并转换为 task tool 调用

### 数据流

```
用户输入 @xxx
    ↓
useAtTriggeredPaths 解析查询词
    ↓
并行请求:
  - usePaths (文件搜索)
  - useAgents (agent 列表)
    ↓
合并结果 + Fuse.js 模糊匹配
    ↓
按相关性排序 (限制最多 15 项)
    ↓
渲染 Suggestion 列表
    ↓
用户选择 → 替换输入为 @agent-xxx 或 @filepath
```

### 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/nodeBridge.types.ts` | 修改 | 添加 `agents.list` 类型定义 |
| `src/nodeBridge/slices/agents.ts` | 新建 | agents.list handler 实现 |
| `src/nodeBridge.ts` | 修改 | 注册 agents handler |
| `src/ui/useAgentSuggestion.ts` | 新建 | agent suggestion hook |
| `src/ui/useFileSuggestion.ts` | 修改 | 合并 agent 建议，统一类型 |
| `src/ui/useInputHandlers.ts` | 修改 | 处理 agent 选择逻辑 |
| `src/ui/ChatInput.tsx` | 修改 | 更新渲染逻辑 |
| `src/ui/Suggestion.tsx` | 修改 | 支持 agent 类型渲染 |
