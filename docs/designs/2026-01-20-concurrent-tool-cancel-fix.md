# 并发 Tool 取消时返回值丢失问题修复

**Date:** 2026-01-20

## Context

在并发返回 3 个 edit tool 时，当用户选择取消其中一个 tool（例如取消第 2 个 tool），整体其他 tool 的返回值出现了丢失或为空的问题。

具体问题表现：
- AI 返回 3 个 edit tool 调用
- 用户逐个审批时，取消了其中一个 tool
- 被取消 tool 之后的 tool 返回值丢失
- 导致 `toolResults` 数组不完整

根本原因分析：
1. 在 `loop.ts` 的 tool 执行循环中，tools 是**顺序执行**的（使用 `for...of` 循环）
2. 当用户取消某个 tool 并提供 `denyReason` 时，代码执行了 `break` 语句
3. `break` 导致后续 tools **没有被处理**，循环提前终止
4. 最终 `toolResults` 数组只包含已处理的 tools，未处理的 tools 结果丢失

用户期望行为：
- 取消一个 tool 后，应该继续逐个确认其他 tools
- 被取消的 tool 应该记录为错误状态
- 所有 tools 都应该有返回结果（批准的执行成功，取消的记录错误）

## Discussion

### 问题确认

通过与用户沟通，明确了以下关键点：

1. **问题表现**：当用户取消其中一个 edit tool 时，其他 tool 的返回值丢失或为空
2. **并发机制**：当前是使用 `for...of` 循环顺序执行，而非真正的并发
3. **期望行为**：逐个确认其他 tool，取消的 tool 记录为错误并继续

### 方案探索

评估了三种解决方案：

**方案 1: 移除 break，确保循环完整执行（推荐）**
- 核心思路：移除 `loop.ts` 中取消 tool 后的 `break` 语句，被取消的 tool 记录为错误状态但循环继续
- 优点：改动最小、风险最低、逻辑简单清晰、完全符合用户期望
- 缺点：如果用户取消并提供了 denyReason，可能需要立即中断以让 AI 响应
- 复杂度：低

**方案 2: 真正的并发执行 + 取消控制**
- 核心思路：将 `for...of` 改为 `Promise.all/allSettled`，每个 tool 独立并发执行
- 优点：真正的并发、性能最优、用户体验更好
- 缺点：改动较大、需要重构 approval 流程、UI 需要支持批量展示
- 复杂度：高

**方案 3: 条件 break - 只在有 denyReason 时中断**
- 核心思路：保留 `break`，但只在用户提供 `denyReason` 时才执行
- 优点：适度改动、平衡各方需求
- 缺点：逻辑稍复杂、用户可能对两种取消行为的差异感到困惑
- 复杂度：中等

### 最终选择

基于用户需求（"逐个确认其他 tool" + "记录为错误并继续"），选择了**方案 1**，原因：
1. 最直接解决当前问题
2. 改动最小，风险最低
3. 完全符合用户期望的行为
4. 未来可以逐步演进到方案 2

## Approach

### 核心修改策略

**修改位置：** `src/loop.ts` 的 tool 执行循环（约 508-600 行）

**问题代码：**
```typescript
for (const toolCall of toolCalls) {
  // ... 获取 approval
  
  if (approved) {
    // 执行 tool
  } else {
    // 记录拒绝结果
    toolResults.push({...});
    
    if (!denyReason) {
      // 没有拒绝原因时，添加消息并返回错误
      await history.addMessage({...});
      return { success: false, error: {...} };
    } else {
      // 有拒绝原因时，break 跳出循环 ← 问题所在！
      break;
    }
  }
}
```

**解决方案：**
1. 移除 `break` 语句
2. 继续循环处理所有 tools
3. 所有 `approved=false` 的 tools 都记录错误结果
4. 在循环结束后统一处理是否需要立即返回

### 关键设计决策

1. **被拒绝的 tool 不影响后续 tools 的执行**
2. **如果有 `denyReason`，在所有 tools 处理完后才返回**，让 AI 能看到完整的执行结果
3. **区分简单取消和带原因拒绝**，采取不同的后续处理策略

## Architecture

### 数据结构修改

在 tool 执行循环中，新增以下状态追踪变量：

```typescript
const toolResults: {...}[] = [];
let hasRejectionWithReason = false;      // 标记是否有带原因的拒绝
let firstDenyReason: string | undefined; // 记录第一个拒绝原因
let hasSimpleDeny = false;               // 记录是否有简单拒绝
let firstDeniedToolUse: ToolUse | undefined; // 记录第一个被拒绝的 tool
```

### 执行流程

**新的执行流程：**

```
1. 开始 for 循环处理所有 toolCalls
   ↓
2. 对每个 tool 请求用户批准 (onToolApprove)
   ↓
3a. 如果批准 → 执行 tool → 记录成功结果
3b. 如果拒绝 → 记录拒绝结果 → 继续下一个
   ↓
4. 循环结束，检查拒绝情况：
   - 有带原因的拒绝？→ 添加所有结果到 history，继续流程
   - 只有简单拒绝？→ 添加所有结果到 history，返回错误
   - 都批准？→ 正常流程
   ↓
5. 继续后续的 AI 响应处理
```

### 核心代码实现

```typescript
for (const toolCall of toolCalls) {
  let toolUse: ToolUse = {
    name: toolCall.toolName,
    params: safeParseJson(toolCall.input),
    callId: toolCall.toolCallId,
  };
  
  if (opts.onToolUse) {
    toolUse = await opts.onToolUse(toolUse as ToolUse);
  }
  
  let approved = true;
  let updatedParams: ToolParams | undefined = undefined;
  let denyReason: string | undefined = undefined;

  if (opts.onToolApprove) {
    const approvalResult = await opts.onToolApprove(toolUse as ToolUse);
    if (typeof approvalResult === 'object') {
      approved = approvalResult.approved;
      updatedParams = approvalResult.params;
      denyReason = approvalResult.denyReason;
    } else {
      approved = approvalResult;
    }
  }

  if (approved) {
    // 执行 tool
    toolCallsCount++;
    if (updatedParams) {
      toolUse.params = { ...toolUse.params, ...updatedParams };
    }
    let toolResult = await opts.tools.invoke(
      toolUse.name,
      JSON.stringify(toolUse.params),
      toolUse.callId,
    );
    if (opts.onToolResult) {
      toolResult = await opts.onToolResult(toolUse, toolResult, approved);
    }
    toolResults.push({
      toolCallId: toolUse.callId,
      toolName: toolUse.name,
      input: toolUse.params,
      result: toolResult,
    });
    turnsCount--;
  } else {
    // 拒绝处理
    let message = 'Error: Tool execution was denied by user.';
    if (denyReason) {
      message = `Tool use rejected with user message: ${denyReason}`;
      hasRejectionWithReason = true;
      if (!firstDenyReason) {
        firstDenyReason = denyReason;
      }
    } else {
      hasSimpleDeny = true;
      if (!firstDeniedToolUse) {
        firstDeniedToolUse = toolUse;
      }
    }
    
    let toolResult: ToolResult = {
      llmContent: message,
      isError: true,
    };
    if (opts.onToolResult) {
      toolResult = await opts.onToolResult(toolUse, toolResult, approved);
    }
    toolResults.push({
      toolCallId: toolUse.callId,
      toolName: toolUse.name,
      input: toolUse.params,
      result: toolResult,
    });
    
    // 移除 break 和 return，继续处理下一个 tool
  }
}

// 循环结束后，统一处理拒绝情况
if (hasSimpleDeny && !hasRejectionWithReason) {
  // 只有简单拒绝，没有拒绝原因 → 按原逻辑返回错误
  await history.addMessage({
    role: 'tool',
    content: toolResults.map((tr) => createToolResultPart2(
      tr.toolCallId,
      tr.toolName,
      tr.input,
      tr.result,
    )),
  });
  return {
    success: false,
    error: {
      type: 'tool_denied',
      message: 'Error: Tool execution was denied by user.',
      details: {
        toolUse: firstDeniedToolUse,
        history,
        usage: totalUsage,
      },
    },
  };
}

// 继续现有的正常流程...
await history.addMessage({
  role: 'tool',
  content: toolResults.map((tr) => createToolResultPart2(
    tr.toolCallId,
    tr.toolName,
    tr.input,
    tr.result,
  )),
});
```

### 边界情况处理

#### 1. 没有 denyReason 的简单取消
- 继续处理其他 tools
- 记录简单取消状态
- 循环后决定是否终止整个流程

#### 2. 所有 tools 都被拒绝
- 所有 tools 标记为 error
- 根据是否有 denyReason 决定返回错误或继续流程

#### 3. 部分批准、部分拒绝
- 已批准的 tools 正常执行
- 被拒绝的 tools 标记为 error
- 所有结果都返回给 AI
- 继续正常流程

### 测试场景

**场景 1: 取消中间的 tool（当前问题场景）**
- 输入：3 个 edit tools 并发返回
- 操作：批准 tool1 → 取消 tool2（带 denyReason）→ 应该继续弹出 tool3
- 期望：tool1 执行成功，tool2 记录拒绝，tool3 继续弹窗，toolResults 包含所有 3 个结果

**场景 2: 取消第一个 tool**
- 输入：3 个 edit tools
- 操作：取消 tool1（带 denyReason）→ 继续处理 tool2, tool3
- 期望：tool1 记录拒绝，tool2/tool3 继续弹窗确认，所有结果都返回

**场景 3: 简单取消（无 denyReason）**
- 输入：3 个 edit tools
- 操作：批准 tool1 → 简单取消 tool2（无 denyReason）
- 期望：tool1 执行成功，tool2 记录拒绝，tool3 继续弹窗，如果后续都简单取消则最终返回 error

**场景 4: 全部批准**
- 输入：3 个 edit tools
- 操作：全部批准
- 期望：所有 tools 正常执行，正常流程继续

**场景 5: 全部取消**
- 输入：3 个 edit tools
- 操作：全部取消（带 denyReason）
- 期望：所有 tools 记录拒绝，所有结果返回给 AI，AI 看到拒绝原因后继续响应

## Implementation Notes

### 修改文件
- `src/loop.ts` - 核心修改点

### 预计改动量
- ~60-80 行代码改动

### 风险评估

**低风险：**
- 改动集中在单一文件
- 逻辑清晰，不影响其他模块
- 向后兼容现有行为

**需要注意：**
- 确保 `toolResults` 数组顺序与 `toolCalls` 一致
- `onToolResult` 回调可能会修改结果，需要确保正确传递
- 与 history 的交互需要保证消息完整性

### 预期影响

**用户体验改进：**
- 用户可以逐个确认所有 tools，不会因取消一个而丢失其他
- 被拒绝的 tools 有明确的错误记录
- AI 能看到完整的执行上下文，做出更好的响应

**性能影响：**
- 执行时间可能略微增加（因为要处理所有 tools）
- 但提升了交互体验，值得这个代价

**兼容性：**
- 完全向后兼容
- 不影响其他 tools 的执行流程
