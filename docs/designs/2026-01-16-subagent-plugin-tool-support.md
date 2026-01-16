# Subagent 插件工具支持优化 (Subagent Plugin Tool Support Optimization)

**Date:** 2026-01-16

## Context
当前 Neovate 的 Subagent (子智能体) 实现存在一个架构问题: 通过插件注册的工具 (Plugin Tools) 无法在 subagent 中使用。虽然在 2026-01-06 已经实现了插件可以注册自定义 Subagent (通过 `agent` hook),但插件注册的**工具**仍然无法被 subagent 访问。

**根本原因分析:**
1. 主 agent 在 `Project.send()` 中调用 `resolveTools()` 获取内置工具
2. 然后手动调用 `context.apply({ hook: 'tool' })` 添加插件工具
3. 但是 `createTaskTool()` 在 `resolveTools()` 内部创建,此时插件工具还未加入列表
4. Subagent 通过 `agentManager.executeTask()` 接收的工具列表不包含插件工具

## Discussion

### 1. 问题根源确认
通过代码分析确认了问题的技术细节:
- `resolveTools()` 函数内部不调用插件的 `tool` hook
- 插件工具的添加是在 `Project` 类中手动完成的
- `createTaskTool()` 接收的工具列表是在调用插件 hook **之前**创建的
- 因此传递给 subagent 的工具列表缺少插件工具

### 2. 工具复用策略讨论
确定了以下设计约束:
- **工具传递方式**: Subagent 应该重新解析并获取工具列表(而非简单继承)
- **插件上下文**: 调用插件的 tool hook 时,使用共享的主 agent context
- **复用策略**: Subagent 总是复用父 agent 的工具列表,不重新调用插件 hook

### 3. 方案探索
讨论了三种架构方案:

**方案 1: 在 resolveTools 中调用插件 hook** ✅ 最终选择
- 将插件 `tool` hook 的调用移入 `resolveTools()` 函数内部
- 确保在创建 `taskTool` 之前,插件工具已经加入列表
- 简化 `Project` 类,移除手动调用插件 hook 的代码

**方案 2: 在 createTaskTool 内部补充插件工具**
- 在 `createTaskTool.execute()` 时再次调用插件 hook
- 优点: 不修改 `resolveTools`
- 缺点: 违反复用原则,插件 hook 被调用两次

**方案 3: 提取工具解析到 Context 初始化阶段**
- 在 `Context.create` 时完成工具解析并缓存
- 优点: 完全避免重复解析
- 缺点: 架构改动大,缓存管理复杂

### 4. 最终决策理由
选择方案 1 的原因:
- ✅ 符合"总是复用父 agent 工具"的需求
- ✅ 改动最小,影响可控
- ✅ 工具解析逻辑统一在一个地方
- ✅ 性能最优,没有重复调用插件 hook

## Approach

通过将插件 `tool` hook 的调用逻辑从 `Project` 类移入 `resolveTools()` 函数内部,确保工具列表在传递给 subagent 之前就已经包含了插件工具。

**核心改动:**
1. 增强 `resolveTools()` 函数,在内部调用 `context.apply({ hook: 'tool' })`
2. 简化 `Project` 类,移除重复的插件 hook 调用代码
3. 保持工具传递链不变,subagent 自动继承完整工具集

**工具传递数据流:**
```
resolveTools() 
  → 解析内置工具
  → 解析 MCP 工具
  → 应用配置过滤
  → ✨ 调用插件 tool hook (新增)
  → 创建 taskTool (现在包含插件工具)
  → 返回完整工具列表

Project.send() 
  → 接收完整工具列表
  → 传递给主 agent

主 Agent 调用 task tool
  → taskTool 接收完整工具列表
  → 传递给 agentManager.executeTask()
  → ✅ Subagent 使用相同的工具列表
```

## Architecture

### 1. resolveTools 函数增强 (`src/tool.ts`)

**接口变更:**
```typescript
type ResolveToolsOpts = {
  context: Context;
  sessionId: string;
  write?: boolean;
  todo?: boolean;
  askUserQuestion?: boolean;
  signal?: AbortSignal;
  task?: boolean;
  isPlan?: boolean;  // ✨ 新增: 标识是否为 plan 模式
};
```

**核心逻辑变更:**
```typescript
export async function resolveTools(opts: ResolveToolsOpts) {
  // ... 现有代码: 解析 readonlyTools, writeTools, mcpTools 等
  
  const allTools = [
    ...readonlyTools, 
    ...writeTools, 
    ...todoTools, 
    ...backgroundTools, 
    ...mcpTools
  ];
  
  // 过滤禁用的工具
  const availableTools = filterToolsByConfig(allTools, opts.context.coools);
  
  // ✨ 新增: 调用插件 tool hook
  const toolsWithPlugins = await opts.context.apply({
    hook: 'tool',
    args: [{ isPlan: opts.isPlan, sessionId: opts.sessionId }],
    memo: availableTools,
    type: PluginHookType.SeriesMerge,
  });
  
  // 创建 task tool (现在包含插件工具)
  const taskTools = opts.task && opts.context.agentManager
    ? [createTaskTool({ 
        context: opts.context,
        tools: toolsWithPlugins,  // ✅ 这里已包含插件工具
        sessionId: opts.sessionId,
        signal: opts.signal,
      })]
    : [];
  
  return [...toolsWithPlugins, ...taskTools];
}
```

**关键点:**
- 插件工具在 `taskTool` 创建**之前**就已经合并到列表中
- `isPlan` 参数传递给插件,允许插件根据模式返回不同工具
- 使用 `SeriesMerge` 策略,插件返回的工具会合并到现有列表

### 2. Project 类简化 (`src/project.ts`)

**send() 方法改动:**
```typescript
async send(message: string | null, opts = {}) {
  // ✅ 直接调用 resolveTools,不需要再手动 apply 'tool' hook
  const tools = await resolveTools({
    context: this.context,
    sessionId: this.session.id,
    write: true,
    todo: true,
    askUserQuestion: !this.context.config.quiet,
    signal: opts.signal,
    task: true,
    isPlan: false,  // ✨ 明确标识为非 plan 模式
  });
  
  // ❌ 删除以下代码:
  // tools = await this.context.apply({
  //   hook: 'tool',
  //   args: [{ sessionId: this.session.id }],
  //   memo: tools,
  //   type: PluginHookType.SeriesMerge,
  // });
  
  // ... 其余代码保持不变
}
```

**plan() 方法改动:**
```typescript
async plan(message: string | null, opts = {}) {
  const toolwait resolveTools({
    context: this.context,
    sessionId: this.session.id,
    write: false,
    todo: false,
    askUserQuestion: !this.context.config.quiet,
    signal: opts.signal,
    task: false,
    isPlan: true,  // ✨ 明确标识为 plan 模式
  });
  
  // ❌ 删除以下代码:
  // tools = await this.context.apply({
  //   hook: 'tool',
  //   args: [{ isPlan: true, sessionId: this.session.id }],
  //   memo: tools,
  //   type: PluginHookType.SeriesMerge,
  // });
  
  // ... 其余代码保持不变
}
```

### 3. 错误处理策略

**插件 hook 调用失败降级处理:**
```typescript
// src/tool.ts - resolveTools 函数
try {
  const toolsWithPlugins = await opts.context.apply({
    hook: 'tool',
    args: [{ isPlan: opts.isPlan, sessionId: opts.sessionId }],
    memo: availableTools,
    type: PluginHookType.SeriesMerge,
  });
  return [...toolsWithPlugins, ...taskTools];
} catch (error) {
  console.warn('[resolveTools] Plugin tool hook failed:', error);
  // 降级处理: 使用不包含插件工具的列表
  return [...availableTools, ...taskTools];
}
```

### 4. 向后兼容性

1. **`isPlan` 参数是可选的**: 默认为 `undefined`,现有调用代码无需立即修改
2. **插件 `tool` hook 的参数保持不变**: `{ sessionId, isPlan? }` 完全向后兼容
3. **不影响现有 subagent**: 内置的 Explore、GeneralPurpose 等继续正常工作

### 5. 实施步骤

1. **修改 `src/tool.ts`**:
   - 添加 `isPlan` 参数到 `ResolveToolsOpts` 类型
   - 在 `availableTools` 过滤后、`taskTools` 创建前调用插件 hook
   - 添加错误处理

2. **修改 `src/project.ts`**:
   - `send()` 方法: 添加 `isPlan: false`,删除手动调用插件 hook 的代码
   - `plan()` 方法: 添加 `isPlan: true`,删除手动调用插件 hook 的代码

3. **检查其他调用点**:
   - 搜索项目中所有调用 `resolveTools` 的地方
   - 确认是否需要添加 `isPlan` 参数

4. **测试验证**:
   - 运行现有单元测试,确保没有破坏现有功能
   - 手动测试: 创建测试插件,验证 subagent 能访问插件工具
   - 测试 plan 模式和 normal 模式都正常工作

### 6. 预期影响范围

- **核心文件修改**: 2 个 (`tool.ts`, `project.ts`)
- **其他可能影响**: 需要检查其他调用 `resolveTools` 的地方
- **风险等级**: 🟢 低 (改动集中,逻辑清晰)

### 7. 边界情况处理

1. **没有插件的情况**: `context.apply` 返回原始的 `memo`,逻辑不变
2. **插件返回空数组**: 合并后工具列表不变,不影响功能
3. **多个插件返回相同名称的工具**: `SeriesMerge` 策略会将所有工具合并到数组中,可能产生重名工具 (建议在文档中说明插件应避免工具名冲突)
