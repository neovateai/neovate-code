# Slash Commit Command

**Date:** 2025-12-20

## Context

用户期望在 `src/slash-commands/builtin/` 下新增一个 `/commit` 内置命令，复用 `src/nodeBridge.ts` 中的 commit message 生成提示词。核心需求是将该提示词抽取为独立函数，支持传入 `language` 参数，使其可复用。

## Discussion

### 命令类型选择
- **prompt 类型**: 类似 `/review`，生成提示词让 AI 执行 commit 流程 ✅ 用户选择
- **local-jsx 类型**: 复用现有 CommitUI 组件，在聊天中渲染交互式界面
- **local 类型**: 直接调用 nodeBridge 生成 commit message 并返回文本结果

用户选择 prompt 类型，因为它更轻量且符合 slash command 的交互模式。

### 提示词函数位置
- **新建 prompts 目录**: 抽取函数到独立目录如 `src/prompts/generateCommit.ts`
- **utils 目录**: 放在 `src/utils/` 下作为工具函数 ✅ 用户选择

### 用户交互
用户期望 AI 使用 `AskUserQuestion` 工具提供多个操作选项，类似 `neo commit` CLI 命令的交互体验：
- Commit - 提交更改
- Commit & Push - 提交并推送
- Create Branch & Commit - 创建新分支并提交

## Approach

采用简洁函数式抽取方案：
1. 将 `createGenerateCommitSystemPrompt` 抽取到 `src/utils/commitPrompt.ts`
2. 函数接受 `language: string` 参数
3. `nodeBridge.ts` 改用新函数，保持向后兼容
4. 新建 `/commit` 命令作为 prompt 类型，引导 AI 使用 `AskUserQuestion` 提供操作选项

## Architecture

### 文件结构
```
src/utils/commitPrompt.ts               # 新建 - 抽取的 prompt 生成函数
src/slash-commands/builtin/commit.ts    # 新建 - /commit 命令
src/slash-commands/builtin/index.ts     # 修改 - 注册命令
src/nodeBridge.ts                       # 修改 - 改用新函数
```

### 核心接口
```typescript
// src/utils/commitPrompt.ts
export function createGenerateCommitSystemPrompt(language: string): string
```

### /commit 命令流程
1. 检查是否有 staged changes
2. 获取 staged diff（排除 lock 文件）
3. 使用 `createGenerateCommitSystemPrompt(language)` 生成系统提示词
4. AI 分析 diff 并生成 commit 信息
5. 展示 commitMessage、branchName、summary、isBreakingChange
6. 使用 `AskUserQuestion` 让用户选择操作
7. 执行对应的 git 命令
