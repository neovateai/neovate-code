# Subagent 继承主 Agent 审批配置

**Date:** 2026-01-14

## Context

当前系统中存在一个用户体验问题：在 subagent 中选择了 "Yes, and don't ask again for bash commands" 后，下次 subagent 执行 bash 命令时仍然会弹出审批请求。主 agent 的审批设置工作正常，但 subagent 的 "don't ask again" 功能失效。

**问题根源：**

1. **Subagent 使用独立的 sessionId**: 在 `executor.ts` 中，每个 subagent 创建时会生成新的 sessionId (`agent-${agentId}`)，创建独立的 Project 实例
2. **审批配置隔离**: 用户在 subagent 中选择 "don't ask again" 时，`approvalTools` 被保存到 subagent 自己的 session config 文件中
3. **配置无法继承**: 下次主 agent 调用新 subagent 时，会生成全新的 agentId 和 session 文件，无法读取之前的审批配置

**用户期望：**
主 agent 统一控制审批配置，subagent 应该继承主 agent 的审批设置。在任何 agent 中选择 "don't ask again" 后，该配置应该对主 agent 和所有 subagent 生效。

## Discussion

### 探索的方案

在设计过程中探索了多个解决方案：

**初始方案（被否决）：**
1. **内存缓存优化**: 在 Project 实例中缓存 SessionConfigManager - 但不解决跨 subagent 实例的问题
2. **写入后立即加载到 Store**: 同步更新 UI store - 增加了不必要的复杂度
3. **延迟写入策略**: 内存标记 + 异步写入 - 异常退出时可能丢失配置

**最终选择的方案：Subagent 读取主 Session 的配置**

核心思路是让 subagent 在审批检查时读取主 session 的配置，并在用户选择 "don't ask again" 时将配置保存到主 session。

### 参数传递深度优化

在设计过程中发现初始方案会导致参数传递链路过深（task.ts → executor.ts → Project.sendWithSystemPromptAndTools → onToolApprove），不利于解耦。

**优化方案对比：**

- **方案 A（采用）**: Project 构造时存储 parentSessionId
  - 在 Project 实例创建时传入并存储为成员变量
  - 后续所有方法调用直接访问，无需层层传递
  - 符合面向对象封装原则

- **方案 B（未采用）**: 通过 Context 查询 Session 层级关系
  - 在 Context 中维护 `sessionRegistry: Map<sessionId, parentSessionId>`
  - 增加了 Context 的职责
  - 需要管理注册表的生命周期

### 职责划分

明确了各层的职责边界：

- **UI 侧**: 只负责展示和收集用户选择，返回审批结果，不处理配置保存逻辑
- **后端侧**: 负责判断配置应该保存到哪个 session（parent 或 current）
- **Project**: 管理自己的 session 信息，包括 parentSessionId

## Approach

**核心解决方案：** 在 Project 构造时存储 parentSessionId，审批检查时优先读取 parent session 的配置。

**实现流程：**

1. **参数传递（最小化）**
   - `task.ts` 已经将主 agent 的 `sessionId` 作为 `parentSessionId` 传递给 `agentManager.executeTask`
   - `executor.ts` 创建 Project 时传入 `parentSessionId`
   - Project 内部存储为成员变量，后续直接使用

2. **审批检查逻辑**
   - 当 subagent 执行工具需要审批时，`project.ts` 的 `onToolApprove` 回调被触发
   - 优先读取 parent session 的 `approvalTools` 配置
   - 如果 parent session 中已包含该工具，直接通过；否则请求用户审批
   - 回退机制：无 parent 时使用自身 session

3. **配置保存**
   - 后端（task.ts）负责决定保存到哪个 session
   - UI 保持简单，只返回用户选择
   - 配置保存到 parent session，确保所有 subagent 共享

**数据流：**

```
主 Agent (sessionId: "xxx")
  ↓ parentSessionId = "xxx"
task.ts executeTask()
  ↓ parentSessionId
executor.ts executeAgent()
  ↓ parentSessionId (构造时传入)
Project 实例 (存储 this.parentSessionId)
  ↓ 审批检查时
读取 parent session 配置
  ↓ 用户选择后
保存到 parent session
```

## Architecture

### 文件改动清单

**1. `src/agent/executor.ts` - Subagent 执行器**

```typescript
// 创建 Project 时传入 parentSessionId（第 107-111 行）
const project = new Project({
  sessionId: `agent-${agentId}`,
  parentSessionId: options.parentSessionId, // 新增
  context,
});
```

**2. `src/project.ts` - Project 类**

```typescript
// 第 24-42 行
export class Project {
  session: Session;
  context: Context;
  // For subagent to inherit parent session config
  parentSessionId?: string; // 新增成员变量
  
  constructor(opts: {
    sessionId?: SessionId;
    parentSessionId?: string; // 新增参数
    context: Context;
  }) {
    this.session = opts.sessionId
      ? Session.fromId({
          id: opts.sessionId,
          logPath: opts.context.paths.getSessionLogPath(opts.sessionId),
        })
      : Session.create();
    this.context = opts.context;
    this.parentSessionId = opts.parentSessionId; // 存储
  }
}
```

**3. `src/project.ts` - 审批检查逻辑调整**

在 `sendWithSystemPromptAndTools` 方法的 `onToolApprove` 回调中（第 417-431 行）：

```typescript
onToolApprove: async (toolUse) => {
  const tool = toolsManager.get(toolUse.name);
  if (!tool) {
    return true;
  }

  // 1. if yolo return true
  const approvalMode = this.context.config.approvalMode;
  if (approvalMode === 'yolo' && tool.approval?.category !== 'ask') {
    return true;
  }

  // 2. if category is read return true
  if (tool.approval?.category === 'read') {
    return true;
  }

  // 3. run tool should approve if true return true
  const needsApproval = tool.approval?.needsApproval;
  if (needsApproval) {
    const needsApprovalResult = await needsApproval({
      toolName: toolUse.name,
      params: toolUse.params,
      approvalMode: this.context.config.approvalMode,
      context: this.context,
    });
    if (!needsApprovalResult) {
      return true;
    }
  }

  // 4. Read parent session config first, so subagent can inherit parent agent's approval settings
  // If there is no parent (independent agent), use its own session
  const sessionIdToCheck = this.parentSessionId || this.session.id;
  const sessionConfigManager = new SessionConfigManager({
    logPath: this.context.paths.getSessionLogPath(sessionIdToCheck),
  });

  // 5. if category is edit check autoEdit config
  if (tool.approval?.category === 'write') {
    if (
      sessionConfigManager.config.approvalMode === 'autoEdit' ||
      approvalMode === 'autoEdit'
    ) {
      return true;
    }
  }

  // 6. check session config's approvalTools config
  if (sessionConfigManager.config.approvalTools.includes(toolUse.name)) {
    return true;
  }

  // 7. request user approval
  return (
    (await opts.onToolApprove?.({
      toolUse,
      category: tool.approval?.category,
    })) ?? false
  );
},
```

**4. 配置保存逻辑**

根据实际实现，配置保存逻辑无需额外修改。当 subagent 中用户选择 "don't ask again" 时，配置会自动保存到 parent session，原因如下：

1. **task.ts 传递的是 parent sessionId**: 在 `src/tools/task.ts` 的 `createTaskTool` 中，`sessionId` 参数传递的就是 parent agent 的 sessionId（不是 subagent 的 sessionId）
2. **UI store 使用该 sessionId 保存**: `src/ui/store.ts` 的 `approveToolUse` 方法接收到的 `sessionId` 就是 parent sessionId，因此配置会被保存到正确的位置
3. **无需代码改动**: 现有的配置保存逻辑已经满足需求，不需要额外修改

**关键代码路径（无需修改）：**
- `task.ts` → `messageBus.request('toolApproval')` → UI store → `approveToolUse(sessionId, ...)`
- 这里的 `sessionId` 始终是 parent session 的 ID

### 边界情况处理

**1. Parent Session 不存在**
- **场景**: 独立运行的 subagent（没有主 agent），parentSessionId 为空
- **处理**: `const sessionIdToCheck = this.parentSessionId || this.session.id;`
- **结果**: 回退到使用自身的 sessionId，行为与当前一致

**2. Parent Session 配置文件损坏或不存在**
- **场景**: parent session 的 log 文件被删除或损坏
- **处理**: SessionConfigManager 的 `load()` 方法会返回 `DEFAULT_SESSION_CONFIG`
- **结果**: 自动容错，不影响功能

**3. 配置保存失败**
- **场景**: 写入 parent session config 失败（权限问题、磁盘满等）
- **处理**: SessionConfigManager 的 `write()` 方法会抛出异常
- **结果**: 记录错误日志，但不阻塞当前审批流程（当前操作仍然通过，但下次可能需要重新审批）

**4. Nested Subagent（未来扩展）**
- **场景**: Subagent A 启动 Subagent B
- **当前设计**: 只传递直接 parent，Subagent B 会读取 Subagent A 的配置
- **未来改进**: 需要递归查找 root session，或在 Context 中维护 root sessionId

### 测试验证

**场景 1: 主 Agent 中选择 "don't ask again"**
- 操作: 在主 agent 中执行 bash 命令，选择 "Yes, and don't ask again for bash commands"
- 验证: 主 agent 后续 bash 命令自动通过 + 启动 subagent 后，subagent 的 bash 命令也自动通过
- 预期: 配置保存到主 session，subagent 继承该配置

**场景 2: Subagent 中选择 "don't ask again"**
- 操作: 在 subagent 中执行 bash 命令，选择 "don't ask again"
- 验证: 当前 subagent 后续 bash 命令自动通过 + 主 agent 的 bash 命令也自动通过 + 启动新的 subagent，其 bash 命令也自动通过
- 预期: 配置保存到主 session（通过 parentSessionId）

**场景 3: 独立运行的 Subagent（无 parent）**
- 操作: 直接独立启动 subagent（parentSessionId 为空）
- 验证: 选择 "don't ask again" 后，配置保存到自身 session
- 预期: 不影响其他 session，行为与当前一致

**验证方法:**
1. 检查配置保存到了哪个 session 的 log 文件（`{sessionId}.jsonl` 中的 `{"type": "config"}` 行）
2. 添加 debug 日志输出当前检查的 sessionId，确认读取的是 parent session config
3. UI 反馈验证：第一次询问，后续不再询问，跨 subagent 实例生效

### 职责划分总结

- **executor.ts**: 传递 parentSessionId 到 Project
- **project.ts**: 存储 parentSessionId，审批检查时优先读取 parent config
- **task.ts**: 处理配置保存逻辑（实际保存由 store.ts 处理）
- **UI (store.ts, ApprovalModal.tsx)**: 保持现状，不需要改动

### 影响范围

- **改动文件数**: 2 个核心文件（`src/agent/executor.ts`, `src/project.ts`）
- **代码增量**: +9 行，-1 行（总计 +8 行净增加）
- **UI 改动**: 无需改动
- **向后兼容性**: 完全兼容，parentSessionId 为可选参数
- **风险评估**: 低风险，改动范围小且有明确的回退机制
