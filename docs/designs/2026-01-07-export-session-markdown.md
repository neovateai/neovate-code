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
2. 前端从 `useAppStore()` 获取 `cwd` 与 `sessionId`
3. 前端调用 node bridge：`bridge.request('session.export', { cwd, sessionId })`
4. node bridge 内部使用 `loadSessionMessages({ logPath: context.paths.getSessionLogPath(sessionId) })` 读取完整消息历史
5. node bridge 内部渲染为 Markdown 并写入 `${cwd}/.log-outputs/session-{sessionId前8位}.md`（覆盖同名文件）
6. 前端显示成功提示：`Exported to {filePath}`

## Architecture

### 指令实现
- **文件位置**：`src/slash-commands/builtin/export.ts`
- **指令注册**：在 `src/slash-commands/builtin/index.ts` 的 `createBuiltinCommands` 中添加
- **指令类型**：`local-jsx`（前端只发起 bridge 请求并输出结果）

### Markdown 格式结构
文件头部包含会话元数据：
- Session ID
- Project（导出时的 cwd）
- Model（当前会话 model 字符串）
- Created / Updated（从会话日志文件 stat 的 birthtime / mtime 推导）

正文按消息顺序展示（忽略 system 消息），并按角色分段：
- `## User` / `## Assistant`：渲染消息文本；如果包含 reasoning，会以 `_Thinking:_` 段落展示
- `## Tool`：渲染工具结果（tool_result）为：Tool 名称 + Input(JSON) + Output(文本)。当 tool 为 `task` 且其返回里包含 agent 模型信息时，会在工具块内额外展示 `**Model:** {toolModel}`（与主 model 不同才显示）

### 数据流处理
1. 前端获取 `cwd/sessionId`：从 `useAppStore()` 读取 `cwd` 与 `sessionId`
2. 前端请求导出：调用 `bridge.request('session.export', { cwd, sessionId })`
3. node bridge 加载消息：在 `src/nodeBridge.ts` 的 handler 内，调用 `loadSessionMessages({ logPath: context.paths.getSessionLogPath(sessionId) })`
4. node bridge 获取 summary / model：
   - summary：尝试从 `SessionConfigManager({ logPath }).config.summary` 获取（失败则忽略）
   - model：复用 handler `session.getModel` 获取 model 字符串
5. node bridge 渲染 Markdown：调用 `renderSessionMarkdown`（实现位于 `src/utils/renderSessionMarkdown.ts`）
6. node bridge 写文件：确保 `${cwd}/.log-outputs` 存在，然后写入 `session-{sessionId前8位}.md`（覆盖），并将 `filePath` 返回给前端

### 错误处理
- 会话不存在（sessionId 为空）：返回 `No active session`
- 无消息可导出：返回 `No messages to export`
- 前端对 bridge 请求异常：显示 `Export failed: {error}`

执行完成后显示成功提示：`Exported to {filePath}`。

### 技术约定
- 遵循现有代码约定（使用 pathe 处理路径、遵循 Biome 格式化）
- 导出逻辑收敛在 node bridge：前端只负责触发与展示结果
- Markdown 渲染函数位于 `src/utils/renderSessionMarkdown.ts` 便于复用
- node bridge handler：`session.export`
