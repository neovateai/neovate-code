# 并行 Tool 执行

**Date:** 2026-03-18

## Context

当前 `loop.ts` 中，当 LLM 返回一条包含多个 `tool_use` 的 assistant 消息时，所有工具调用是通过 `for...of` 循环**顺序执行**的。这意味着即使 LLM 在同一条消息中返回了多个 task（subagent）调用，第二个 task 也必须等待第一个完全执行完毕才能开始。

参考 Claude Code 的实现（通过逆向分析 `versions/2.1.29/cli.js` 得到），其核心机制是使用 `Promise.all()` 并行执行同一条消息中的所有 `tool_use` 块，从而实现真正的并行 subagent 执行以及所有只读工具的并行加速。

目标：将 Neovate Code 的工具执行模型从顺序改为并行，同时 UI 能同时展示多个 subagent 的实时进度。

## Discussion

### 探讨过的方案

**方案 A: 分组并行** — 将 task 类工具并行执行，其他工具顺序执行。改动集中在 `loop.ts`，风险可控，但灵活性有限。

**方案 B: 仅连续 task 并行** — 最小改动，识别连续的 task tool calls 并行执行，其他不变。UI 零改动。风险最低但收益有限。

**方案 C: 通用并行框架** — 所有只读工具都可并行，改动范围大，测试成本高。

**最终选择：全部 tool 并行执行**（参考 Claude Code 实现）— 在看到 Claude Code 的逆向分析后，决定直接采用 `Promise.all` 并行所有 tool_use 的做法，获得最佳体验。

### 关键决策

- **审批流程**：沿用现有逻辑，顺序进行审批（UI 一次只能展示一个 ApprovalModal）。审批完成后再并行执行。
- **denial 处理**：被拒绝的 tool 只跳过该工具，其他已批准的工具继续并行执行。无 denyReason 的拒绝保持现有行为（终止所有后续工具）。
- **UI 层**：零改动。`agentProgressMap` 按 `toolUseId` 索引，`Messages.tsx` 逐个渲染每个 tool pair，天然支持多 agent 并行展示。

### 风险评估

| 风险 | 严重程度 | 缓解措施 |
|------|----------|---------|
| 多个 bash 并行写文件冲突 | 高 | LLM 通常不会在同一批返回多个写操作 |
| onToolResult 回调竞争 | 中 | 需检查实现确保无共享可变状态 |
| 多个 write/edit 并行操作同一文件 | 中 | LLM 自行规避 |
| 内存压力（多 agent 同时运行） | 低 | subagent 本身就是独立 session |

## Approach

将 `loop.ts` 中的顺序 `for...of` 工具执行循环改为两阶段模型：

1. **Phase 1 顺序审批**：逐个对 toolCalls 进行 approval 检查，收集 approved 和 denied 列表
2. **Phase 2 并行执行**：对所有 approved 的 toolCalls 使用 `Promise.allSettled()` 并行执行
3. **Phase 3 结果收集**：合并 approved 执行结果和 denied 错误结果，按原始顺序排列后写入 history

核心改动仅在 `src/loop.ts` 一个文件，约 50 行代码。

## Architecture

### 改动文件

| 文件 | 改动范围 | 说明 |
|------|---------|------|
| `src/loop.ts` | ~50 行 | 替换顺序循环为并行执行 |

### 不需要改动的文件

- `src/agent/executor.ts` — 每个 agent 已是独立 session，天然支持并行
- `src/agent/agentManager.ts` — `executeTask` 是无状态的，直接并行调用即可
- `src/tools/task.ts` — task tool 的 `execute` 函数本身不需要改
- `src/ui/store.ts` — `agentProgressMap` 按 `toolUseId` 索引，天然支持多 agent 并行更新
- `src/ui/AgentProgress/` — 天然支持多 agent 渲染
- `src/messageBus.ts` — 事件系统异步解耦

### 执行流程

```
LLM 返回: [text, task1, task2, read1, bash1]

Phase 1: 顺序审批
  approval(task1) → approved ✓
  approval(task2) → denied (with reason) → 跳过，继续
  approval(read1) → approved ✓
  approval(bash1) → approved ✓

Phase 2: 并行执行
  Promise.allSettled([
    execute(task1),   // → agentProgressMap['task1-id'] 实时更新
    execute(read1),   // → 读文件
    execute(bash1),   // → 执行命令
  ])

Phase 3: 结果收集
  toolResults = [
    task1 result (fulfilled),
    task2 result (denied error),
    read1 result (fulfilled),
    bash1 result (fulfilled),
  ]
  → 按原始顺序写入 history
```

### 核心伪代码

```typescript
// Phase 1: 顺序审批
const approvedCalls: { toolCall, toolUse }[] = [];
const deniedResults: ToolCallResult[] = [];
let shouldBreak = false;

for (const toolCall of toolCalls) {
  let toolUse = buildToolUse(toolCall);
  if (opts.onToolUse) toolUse = await opts.onToolUse(toolUse);

  const { approved, updatedParams, denyReason } = await doApproval(toolUse);

  if (approved) {
    if (updatedParams) toolUse.params = { ...toolUse.params, ...updatedParams };
    approvedCalls.push({ toolCall, toolUse });
  } else {
    deniedResults.push(buildDeniedResult(toolUse, denyReason));
    if (!denyReason) {
      addDeniedResultsForRemainingTools();
      shouldBreak = true;
      break;
    }
  }
}

// Phase 2: 并行执行所有已批准的工具
if (!shouldBreak && approvedCalls.length > 0) {
  toolCallsCount += approvedCalls.length;
  const results = await Promise.allSettled(
    approvedCalls.map(async ({ toolUse }) => {
      let toolResult = await opts.tools.invoke(
        toolUse.name, JSON.stringify(toolUse.params), toolUse.callId,
      );
      if (opts.onToolResult) {
        toolResult = await opts.onToolResult(toolUse, toolResult, true);
      }
      return { toolCallId: toolUse.callId, toolName: toolUse.name,
               input: toolUse.params, result: toolResult };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      toolResults.push(result.value);
    } else {
      toolResults.push(buildErrorResult(result.reason));
    }
  }
}

// Phase 3: 合并 denied 结果，按原始 toolCalls 顺序排列
// turnsCount 一次性减去 approvedCalls.length
turnsCount -= approvedCalls.length;
```

### 边界情况

| 场景 | 处理方式 |
|------|---------|
| 单个 tool_use | 退化为单个 Promise，行为完全一致 |
| 所有 tool 被拒绝 | 每个返回 denied error，无并行执行 |
| 并行执行中 signal abort | 所有工具共享同一个 signal，同时中止 |
| 一个工具失败另一个成功 | `allSettled` 不互相影响，各自返回 |
| subagent 内部请求 tool approval | 通过 messageBus 独立请求，不影响其他并行工具 |

### 测试策略

- **单元测试**：mock tools，验证多个 toolCalls 是并行执行的（总执行时间应约等于最长那个工具的时间，而非总和）
- **集成测试**：手动验证多个 Explore agent 并行执行时 UI 正确显示多个进度
