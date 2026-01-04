# Brainstorm Mode 下斜杠命令执行修复

**日期:** 2026-01-04

## 背景

当用户通过 `Shift + Tab` 切换至 brainstorm mode 后，再通过 `/` 斜杠命令打开命令面板，选择对应的命令并回车时，系统并不会执行该命令，而是直接发送问题。这导致用户无法在 brainstorm mode 中正常使用斜杠命令。

## 讨论

### 问题根因分析

通过探索代码库，发现问题的根本原因在于 `src/ui/store.ts` 的 `send` 方法中逻辑顺序不当：

1. 当前顺序：先检查 `brainstormMode` 并包装消息，再判断是否为斜杠命令
2. 当用户在 brainstorm mode 下输入斜杠命令（如 `/spec:brainstorm`）时
3. `send` 方法会将命令包装成 `/spec:brainstorm /spec:brainstorm`
4. 这个双重包装的命令无法被 `isSlashCommand` 正确识别
5. 最终导致命令执行失败或作为普通消息发送

### 关键决策

**问题 1**：修复后，在 brainstorm mode 下使用斜杠命令时，执行完命令后 brainstorm mode 应该保持什么状态？
- **决策**：保持 brainstorm mode（不自动退出）

**问题 2**：采用哪种技术方案？
- **方案 A**：修改 send 方法顺序 - 调整 `store.ts` 的 `send` 方法中逻辑顺序，先判断斜杠命令，执行后再检查 brainstorm 包装
- **方案 B**：在提交层拦截 - 在 handleSubmit 中识别斜杠命令时，临时禁用 brainstorm 包装
- **方案 C**：分离命令处理 - 将斜杠命令处理完全独立于普通消息发送流程
- **决策**：方案 A（修改 send 方法顺序）
  - 理由：改动集中在单一位置，逻辑清晰，易于维护

## 方案

调整 `src/ui/store.ts` 中 `send` 方法的逻辑执行顺序，确保斜杠命令的判断优先于 brainstorm mode 的包装逻辑。修复后的执行流程：

1. 接收消息参数
2. **优先判断**：使用 `isSlashCommand()` 检查消息是否为斜杠命令
3. 如果是斜杠命令 → 直接执行，**跳过** brainstorm 包装逻辑
4. 如果不是斜杠命令 → 检查 `brainstormMode` 状态，若为 true 则包装为 `/spec:brainstorm ${message}`

## 架构

### 修改文件

- **`src/ui/store.ts`**（约第 467-473 行）
  - 修改 `send` 方法中的逻辑顺序
  - 在 brainstormMode 包装逻辑之前，先进行斜杠命令判断

### 代码结构

```typescript
send: async (message) => {
  const {
    bridge,
    cwd,
    sessionId,
    planMode,
    brainstormMode,
    status,
    pastedTextMap,
  } = get();

  // 优先判断：检查是否为斜杠命令
  if (isSlashCommand(message)) {
    // 直接执行斜杠命令，不进行 brainstorm 包装
    // 命令执行后 brainstormMode 保持不变
    // ... 斜杠命令处理逻辑
  }

  // 仅在非斜杠命令时进行 brainstorm 包装
  if (brainstormMode && !isSlashCommand(message)) {
    message = `/spec:brainstorm ${message}`;
    set({
      brainstormMode: false,
    });
  }

  // ... 后续处理
}
```

### 执行流程

1. **斜杠命令在 brainstorm mode 下**：
   - 用户输入 `/` → 打开命令面板
   - 选择命令（如 `/model`）→ 按回车
   - `handleSubmit` 检测到斜杠命令 → 调用 `send('/model')`
   - `send` 方法中 `isSlashCommand('/model')` 返回 true
   - 直接执行 `/model` 命令
   - **brainstormMode 保持 true**

2. **普通消息在 brainstorm mode 下**：
   - 用户输入普通文本 → 按回车
   - `handleSubmit` 未检测到斜杠命令 → 调用 `send('普通文本')`
   - `send` 方法中 `isSlashCommand('普通文本')` 返回 false
   - 检查到 `brainstormMode` 为 true
   - 包装为 `/spec:brainstorm 普通文本` 并执行
   - 设置 `brainstormMode` 为 false（原有逻辑保持不变）

### 边界情况

- **空斜杠命令**：`isSlashCommand('/')` 返回 false，不会影响 brainstorm 包装逻辑
- **文件路径斜杠**：`isSlashCommand` 会排除文件路径，避免误判
- **重复斜杠命令**：已通过优先级判断解决，不会出现双重包装

### 依赖关系

- `isSlashCommand()` 函数位于 `src/slashCommand.ts`（第 229-239 行）
- 斜杠命令面板逻辑位于 `src/ui/useSlashCommands.ts`
- 回车键处理逻辑位于 `src/ui/useInputHandlers.ts`

这些模块无需修改，仅需调整 `store.ts` 中的调用顺序即可。
