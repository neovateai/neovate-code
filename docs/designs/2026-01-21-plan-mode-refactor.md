# Plan Mode 完整重构

**Date:** 2026-01-21

## Context

Neovate Code 现有一个简化版的 Plan Mode，但缺少 Claude Code 的核心功能。参考 `plan-mode-implementation.md` 和 `planFilePath-generation-rules.md` 文档，需要对 Plan Mode 进行完整重构，实现与 Claude Code 一致的行为。

### 现有状态

- 已有简化版 Plan Mode，通过 `planSystemPrompt.ts` 和 `store.ts` 中的 `planMode` 状态实现
- 缺少 `EnterPlanMode` 和 `ExitPlanMode` 工具
- 常量 `AGENT_TYPE.PLAN` 已定义但未实现
- 缺少 5 阶段工作流和计划文件持久化

### 目标

完整复刻 Claude Code 的 Plan Mode 功能：
- 实现 EnterPlanMode/ExitPlanMode 工具
- 完整 5 阶段工作流
- Plan Agent 子代理
- 友好的 Slug 命名 (`{形容词}-{动词}-{名词}.md`)
- 全局配置目录存储 (`~/.neovate/plans/`)

## Discussion

### 关键决策

1. **实现范围**：选择完整复刻 Claude Code，而非简化版或渐进式实现
2. **计划文件位置**：选择全局配置目录 (`~/.neovate/plans/`)，遵循 Claude Code 模式
3. **Plan Agent**：实现独立的 Plan Agent 子代理，支持并行设计探索
4. **快捷键**：保留现有 Shift+Tab 循环切换逻辑

### 架构选择

采用**工具驱动架构**（方案 A）：
- AI 主动调用 `EnterPlanMode` / `ExitPlanMode` 工具控制模式切换
- 与 Claude Code 行为完全一致
- AI 可自主判断何时需要规划

### 通信模式

使用 **MessageBus** 进行工具与 UI 通信（参考 `task.ts` 和 `bash.ts`），而非直接操作 store：
- 工具通过 `messageBus.emitEvent()` 发送事件
- UI 层监听事件后更新 store 状态
- 保持工具与 UI 解耦

## Approach

### 5 阶段工作流

1. **Phase 1: Initial Understanding** - 使用 Explore agents 理解需求和代码
2. **Phase 2: Design** - 使用 Plan agents 设计实现方案
3. **Phase 3: Review** - 审查计划与用户意图的一致性
4. **Phase 4: Final Plan** - 写入最终计划到计划文件
5. **Phase 5: Call ExitPlanMode** - 提交计划供用户审批

### Slug 生成规则

- 格式：`{形容词}-{动词}-{名词}`
- 示例：`peaceful-dancing-firefly`, `async-compiling-nebula`
- 词汇表：~200 形容词 × ~100 动词 × ~200 名词 = 400万种组合
- 冲突处理：缓存 + 文件系统检查 + 最多 10 次重试

### 工具过滤

由 Subagent 自行处理，通过 `AgentDefinition` 中的 `tools` 和 `disallowedTools` 配置，无需在 `resolveTools()` 中做额外过滤。

## Architecture

### 文件结构

```
src/
├── tools/
│   ├── enterPlanMode.ts    # EnterPlanMode 工具
│   └── exitPlanMode.ts     # ExitPlanMode 工具
├── agent/builtin/
│   └── plan.ts             # Plan Agent 子代理
├── planFile.ts             # 计划文件管理（路径、读写、缓存）
└── utils/
    └── planSlug.ts         # Slug 生成器
```

### 需修改文件

```
src/
├── tool.ts                 # resolveTools() 中注册新工具
├── planSystemPrompt.ts     # 增强 5 阶段工作流指导
├── ui/store.ts             # 添加 planFilePath、planPhase 状态
├── ui/ApprovalModal.tsx    # 增强计划审批 UI
├── agent/builtin/index.ts  # 注册 Plan Agent
├── constants.ts            # 新增工具名和事件常量
└── ui/App.tsx              # MessageBus 事件监听
```

### 常量定义

```typescript
// src/constants.ts
export const TOOL_NAMES = {
  // ...现有工具
  ENTER_PLAN_MODE: 'EnterPlanMode',
  EXIT_PLAN_MODE: 'ExitPlanMode',
} as const;

export const PLAN_MODE_EVENTS = {
  ENTER_PLAN_MODE: 'plan.enter',
  EXIT_PLAN_MODE: 'plan.exit',
  PLAN_APPROVED: 'plan.approved',
  PLAN_DENIED: 'plan.denied',
} as const;
```

### EnterPlanMode 工具

```typescript
export function createEnterPlanModeTool(opts: {
  context: Context;
  sessionId: string;
  messageBus?: MessageBus;
  planFileManager: PlanFileManager;
}) {
  return createTool({
    name: TOOL_NAMES.ENTER_PLAN_MODE,
    parameters: z.strictObject({}),
    
    execute: async (params, toolCallId) => {
      // 1. 检查是否在 Agent 上下文（禁止）
      if (context.agentId) {
        return { llmContent: 'Cannot use in agent contexts', isError: true };
      }
      
      // 2. 生成/获取计划文件路径
      const planFilePath = planFileManager.getPlanFilePath(sessionId);
      
      // 3. 通过 MessageBus 通知 UI
      if (messageBus) {
        await messageBus.emitEvent(PLAN_MODE_EVENTS.ENTER_PLAN_MODE, {
          sessionId, planFilePath, planExists, timestamp: Date.now(),
        });
      }
      
      // 4. 返回引导信息
      return { llmContent: buildEnterPlanModeResponse(...) };
    },
    
    approval: { category: 'ask', needsApproval: async () => true },
  });
}
```

### ExitPlanMode 工具

```typescript
export function createExitPlanModeTool(opts: {
  context: Context;
  sessionId: string;
  messageBus?: MessageBus;
  planFileManager: PlanFileManager;
}) {
  return createTool({
    name: TOOL_NAMES.EXIT_PLAN_MODE,
    parameters: z.strictObject({}),
    
    execute: async (params, toolCallId) => {
      const planFilePath = planFileManager.getPlanFilePath(sessionId);
      const planContent = planFileManager.readPlan(sessionId);
      
      if (messageBus) {
        await messageBus.emitEvent(PLAN_MODE_EVENTS.EXIT_PLAN_MODE, {
          sessionId, planFilePath, planContent, isAgent: !!context.agentId,
        });
      }
      
      return { llmContent: buildExitPlanModeResponse(...) };
    },
    
    approval: { category: 'ask', needsApproval: async () => true },
  });
}
```

### Plan Agent 定义

```typescript
export function createPlanAgent(opts: { context: Context }): AgentDefinition {
  return {
    agentType: AGENT_TYPE.PLAN,
    source: AgentSource.BuiltIn,
    
    whenToUse: `Use during plan mode Phase 2 (Design) to explore implementation approaches...`,
    
    systemPrompt: `You are a Plan Agent responsible for designing implementation strategies...`,
    
    model: opts.context.config.planModel || opts.context.config.model,
    
    tools: ['read', 'ls', 'glob', 'grep', 'fetch', 'AskUserQuestion'],
    disallowedTools: ['write', 'edit', 'bash', 'EnterPlanMode', 'ExitPlanMode'],
    
    forkContext: true,
    color: '#9333EA',
  };
}
```

### Store 状态增强

```typescript
interface AppState {
  // 现有状态
  planMode: boolean;
  
  // 新增状态
  planFilePath: string | null;
  planPhase: 'explore' | 'design' | 'review' | 'finalize' | 'exit' | null;
  planContent: string | null;
}

interface AppActions {
  enterPlanMode: (opts: { planFilePath: string; planExists: boolean }) => void;
  exitPlanMode: (opts: { approved: boolean; approvalMode?: string; feedback?: string }) => void;
  updatePlanPhase: (phase: PlanPhase) => void;
  setPlanContent: (content: string | null) => void;
}
```

### 审批 UI

ExitPlanMode 触发专用审批视图：
- 显示计划文件路径和内容预览
- 三个选项：
  - "Yes, auto-accept edits" (推荐)
  - "Yes, manually approve edits"
  - "No, keep planning" (可输入反馈)

### 实现顺序

| 阶段 | 内容 | 预估时间 |
|------|------|---------|
| 1 | 基础设施 (planSlug.ts, planFile.ts, constants.ts) | 2-3h |
| 2 | 核心工具 (enterPlanMode.ts, exitPlanMode.ts) | 3-4h |
| 3 | Agent 与提示 (plan.ts, planSystemPrompt.ts) | 2-3h |
| 4 | 状态与 UI (store.ts, ApprovalModal.tsx) | 3-4h |
| 5 | 整合 (tool.ts, App.tsx) | 1-2h |
| 6 | 测试 | 3-4h |
| **总计** | | **14-20h** |

### 工具可用性矩阵

| 工具 | 正常模式 | Plan Mode | Agent 上下文 |
|------|---------|-----------|-------------|
| read, ls, glob, grep, fetch | ✅ | ✅ | ✅ |
| write, edit, bash | ✅ | ❌ (仅计划文件) | 取决于配置 |
| EnterPlanMode | ✅ | ❌ | ❌ |
| ExitPlanMode | ❌ | ✅ | ❌ |
| AskUserQuestion | ✅ | ✅ | ✅ |
| Task (Explore/Plan) | ✅ | ✅ | ❌ |
