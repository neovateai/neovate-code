# Export Session to Markdown

**Date:** 2026-01-07

## Context

用户需要一个功能来导出当前会话的完整对话记录。参考文档中已有类似的导出能力（如 opencode export 命令导出为 JSON），现在需要在 neovate-code 项目中添加一个 `/export` 斜杠指令，将整个会话导出为易读的 Markdown 文件格式，保存到当前工作目录。

## Discussion

### 需求收集
- **导出内容范围**：整个会话的完整对话记录，包括用户消息、助手回复、工具调用细节
- **包含信息**：会话基本信息（ID、创建时间、更新时间）、用户消息和助手回复、工具调用细节（如 bash、edit、read 等）
- **保存位置**：当前工作目录（process.cwd()）
- **文件命名**：`session-{sessionID前8位}.md`
- **文件冲突处理**：覆盖现有文件

### 方案探索
提出了三种可能的实现方式：
1. **斜杠指令式**（推荐采纳）：用户在对话中输入 `/export` 直接导出，集成度高，体验流畅
2. **工具集成式**：创建通用导出工具，支持多种格式，更灵活但复杂度中等
3. **CLI 独立命令式**：类似参考文档的 opencode export，独立于对话流程，适合批量导出

最终选择了**方案 A（斜杠指令式）**，因为它最符合用户在对话中直接使用的需求。

## Approach

实现 `/export` 斜杠指令，通过以下流程完成导出：
1. 用户输入 `/export`
2. 前端从 `useAppStore()` 获取 `cwd` 与 `sessionId`（参考 `src/slash-commands/builtin/status.ts`）
3. 前端调用 node bridge：`bridge.request('session.export.sessionMarkdown', { cwd, sessionId })`
4. node bridge 内部使用 `loadSessionMessages({ logPath: context.paths.getSessionLogPath(sessionId) })` 读取完整消息历史
5. node bridge 内部渲染为 Markdown 并写入 `${cwd}/session-{前8位}.md`（覆盖同名文件）
6. 前端显示成功提示（导出文件路径等）

## Architecture

### 指令实现
- **文件位置**：`src/slash-commands/builtin/export.ts`
- **指令注册**：在 `src/slash-commands/builtin/index.ts` 的 `createBuiltinCommands` 中添加
- **指令类型**：`local-jsx`（前端只发起 bridge 请求并输出结果）

### Markdown 格式结构
文件头部包含会话元数据（ID、创建/更新时间、消息数、总 token），然后按时间顺序展示对话记录：
- 用户消息：显示内容和时间戳
- 助手回复：显示内容、时间、使用的模型、token 消耗、成本
- 工具调用：单独展示每个工具（bash、edit、read、write、fetch 等），包括输入参数和执行结果

### 数据流处理
1. 前端获取 `cwd/sessionId`：参考 `src/slash-commands/builtin/status.ts`，从 `useAppStore()` 读取 `cwd` 与 `sessionId`
2. 前端请求导出：调用 `bridge.request('session.export.sessionMarkdown', { cwd, sessionId })`
3. node bridge 加载消息：在 `src/nodeBridge.ts` 的 handler 内，调用 `loadSessionMessages({ logPath: context.paths.getSessionLogPath(sessionId) })`
4. node bridge 渲染 Markdown：调用 `renderSessionMarkdown`（建议放在 `src/utils/renderSessionMarkdown.ts`）
5. node bridge 写文件：写入 `${cwd}/.log-outputs/session-{sessionId前8位}.md`，若已存在则覆盖，并将 `filePath` 返回给前端

### 错误处理
- 会话不存在：提示 "No active session"
- 消息获取失败：捕获异常并显示错误信息
- 文件写入失败：显示文件系统错误信息
- 无消息可导出：提示 "No messages to export"

执行完成后显示成功提示，包括导出文件路径、消息数量、文件大小。

### 技术约定
- 遵循现有代码约定（使用 pathe 处理路径、遵循 Biome 格式化）
- 导出逻辑尽量收敛在 node bridge：前端只负责触发与展示结果
- Markdown 渲染函数放在 `src/utils/renderSessionMarkdown.ts` 便于复用
- node bridge handler 命名采用分层：`session.export.sessionMarkdown`
