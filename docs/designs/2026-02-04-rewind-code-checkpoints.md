# Rewind 代码回滚与变更收集

**Date:** 2026-02-04

## Context

参考 Claude Code 的 `/rewind` 命令技术实现（REWIND_TECHNICAL_DOC.md），为 neovate-code 实现完整的代码回滚和变更收集功能。

核心目标：
- 追踪 AI 对代码文件的所有修改
- 为每条 AI 回复消息自动创建文件快照
- 支持将代码回滚到任意历史消息时的状态
- 提供 dry run 预览功能，显示回滚的 diff 统计

## Discussion

### 功能范围讨论

确定实现完整的 `/rewind` 命令，包括：
- UI 交互
- 消息选择器
- 快照恢复
- 预览统计

### 设计方案探索

提出了三种设计方案：

| 方案 | 描述 | 复杂度 |
|------|------|--------|
| A. 独立 FileHistory 模块 | 独立模块 + NodeBridge Handler，低侵入性 | ⭐⭐⭐ |
| B. 集成到 Session 类 | 与 Session 生命周期绑定，状态管理集中 | ⭐⭐⭐⭐ |
| C. 插件化设计 | 通过 Plugin hook 机制注入，可选启用 | ⭐⭐⭐⭐⭐ |

**最终选择方案 A**：独立 FileHistory 模块 + NodeBridge Handler
- 完全解耦，可独立测试
- 与现有代码侵入性最小
- 符合项目现有的模块化风格

### 文件结构讨论

最初提出将逻辑拆分为多个文件（backup.ts, diff.ts, utils.ts），但最终决定采用类的方式将逻辑内聚，简化目录结构。

### UI 设计讨论

最初计划创建独立的 `/rewind` slash command，但最终决定复用并增强现有的 `ForkModal.tsx`：
- 当会话存在可回滚代码时，在 ForkModal 中显示 Rewind 选项
- 提供 4 种恢复选项，用户可以选择只恢复代码、只恢复会话、或两者都恢复

### 命名讨论

配置项从 `fileCheckpointing` 改为 `checkpoints`，更加简洁。

## Approach

### 核心架构

采用独立模块设计：
1. 创建 `src/snapshot/` 目录存放核心逻辑
2. 通过 NodeBridge handlers 暴露给 UI 层
3. 增强现有 ForkModal 实现 rewind UI

### 变更收集策略

- **追踪时机**：write/edit 工具执行成功后
- **快照时机**：每条 AI 回复消息后
- **增量备份**：文件未变更时复用上一个快照的备份引用

### UI 集成方式

增强 ForkModal，当存在代码快照时显示 4 个选项：
1. Restore code and conversation
2. Restore conversation
3. Restore code
4. Never mind

## Architecture

### 文件结构

```
src/
├── snapshot/
│   ├── index.ts              # 导出入口
│   ├── types.ts              # 类型定义
│   └── FileHistory.ts        # 核心 FileHistory 类
├── nodeBridge/
│   └── slices/
│       └── snapshot.ts       # NodeBridge handlers
```

### 核心数据结构

```typescript
// 单个文件的备份元数据
interface FileBackupMeta {
  backupFileName: string | null;  // null = 文件已删除
  version: number;
  backupTime: Date;
}

// 快照：某个消息时刻的所有追踪文件状态
interface Snapshot {
  messageId: string;
  timestamp: Date;
  trackedFileBackups: Record<string, FileBackupMeta>;
}

// FileHistory 状态
interface FileHistoryState {
  snapshots: Snapshot[];
  trackedFiles: Set<string>;
}

// 恢复结果
interface RewindResult {
  success: boolean;
  filesChanged: string[];
  insertions: number;
  deletions: number;
}
```

### 存储路径

`~/.neovate/file-history/{sessionId}/`

### 备份文件命名

`SHA256(filePath).slice(0,16) + "@v" + version`

### FileHistory 核心方法

```typescript
class FileHistory {
  trackFile(filePath: string): void;
  createSnapshot(messageId: string): Promise<Snapshot>;
  rewindToMessage(messageId: string): Promise<RewindResult>;
  previewRewind(messageId: string): Promise<RewindResult>;
  
  // 私有方法
  private getBackupPath(backupFileName: string): string;
  private hasFileChanged(filePath: string, backupFileName: string): boolean;
  private createBackup(filePath: string, version: number): FileBackupMeta;
  private restoreFile(targetPath: string, backupFileName: string): void;
}
```

### NodeBridge Handlers

```typescript
'snapshot.list': (params: { cwd, sessionId }) => Promise<{ snapshots: [...] }>
'snapshot.rewind': (params: { cwd, sessionId, messageId }) => Promise<RewindResult>
'snapshot.preview': (params: { cwd, sessionId, messageId }) => Promise<RewindResult>
'snapshot.has': (params: { messageId }) => Promise<boolean>
```

### 变更追踪集成

在 `loop.ts` 的 `onToolResult` 回调中添加钩子：

```typescript
onToolResult: async (toolUse, toolResult, approved) => {
  if (approved && !toolResult.isError) {
    if (toolUse.name === 'write' || toolUse.name === 'edit') {
      const filePath = toolUse.params.file_path;
      await fileHistory.trackFile(filePath);
    }
  }
  return toolResult;
}
```

### ForkModal UI 增强

```
┌─────────────────────────────────────────────────────────────────┐
│  Confirm you want to restore to the point before you sent       │
│  this message:                                                   │
│                                                                  │
│  │ 创建一个 codemod 页面                                         │
│  │ (1w ago)                                                      │
│                                                                  │
│  The conversation will be forked.                                │
│  The code will be restored +0 -103 in deep-humming-goose.md.     │
│                                                                  │
│  ❯ 1. Restore code and conversation                             │
│    2. Restore conversation                                       │
│    3. Restore code                                               │
│    4. Never mind                                                 │
│                                                                  │
│  ⚠ Rewinding does not affect files edited manually or via bash.  │
│                                                                  │
│  Enter to continue · Esc to exit                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 选项执行逻辑

| 选项 | 代码恢复 | 会话 Fork |
|------|---------|-----------|
| Restore code and conversation | ✅ | ✅ |
| Restore conversation | ❌ | ✅ |
| Restore code | ✅ | ❌ |
| Never mind | ❌ | ❌ |

### 配置选项

```typescript
interface Config {
  checkpoints?: boolean;  // 默认 true
}

// 环境变量
NEOVATE_DISABLE_CHECKPOINTS=1
```

### 错误处理

| 场景 | 处理方式 |
|------|---------|
| 快照不存在 | 显示提示消息 |
| 备份文件缺失 | 跳过该文件，继续恢复其他文件 |
| 文件权限错误 | 记录错误，继续执行 |
| 目标目录不存在 | 自动创建目录 |

### 实现计划

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/snapshot/types.ts` | 新建 | 类型定义 |
| `src/snapshot/FileHistory.ts` | 新建 | 核心类 |
| `src/snapshot/index.ts` | 新建 | 导出入口 |
| `src/nodeBridge/slices/snapshot.ts` | 新建 | NodeBridge handlers |
| `src/nodeBridge.ts` | 修改 | 注册 snapshot handlers |
| `src/nodeBridge.types.ts` | 修改 | 添加类型定义 |
| `src/context.ts` | 修改 | 添加 fileHistory 属性 |
| `src/loop.ts` | 修改 | 添加变更追踪钩子 |
| `src/ui/ForkModal.tsx` | 修改 | 添加 Rewind 选项 |
| `src/ui/store.ts` | 修改 | 添加 rewind 相关 action |
