# Bash 输出折叠与 Ctrl-O 展开支持

**Date:** 2026-01-09

## Context
用户提出需要支持 Bash 输出的 `Ctrl+O` 交互，具体要求为：
1.  默认最多展示 5 行内容。
2.  支持使用 `Ctrl+O`（即切换 Transcript Mode）展开完整内容。
3.  参考 GitHub Issue #600 及现有的 DiffViewer 交互模式。

当前系统中，`Ctrl+O` 已用于切换全局的 `transcriptMode`，DiffViewer 和 AgentProgress 组件已支持此模式，但 Bash 输出（包括用户手动执行的 `!` 命令和 Agent 调用的 `bash` 工具）目前是完整展示，容易占据大量屏幕空间。

## Discussion
在设计过程中，主要讨论了以下几点：

1.  **现有机制分析**：
    *   系统已存在 `transcriptMode` 状态（由 `Ctrl+O` 触发）。
    *   `DiffViewer` 和 `AgentProgress` 已经实现了基于此状态的“折叠/展开”逻辑。

2.  **适用范围探讨**：
    *   **选项 A**：应用到所有文本类型的工具输出（如 `read` 文件读取等）。
    *   **选项 B**：仅应用于 Bash 工具输出。
    *   **结论**：用户明确指定**仅限于 Bash 输出**（包含用户手动输入的命令和 Agent 调用的工具）。

3.  **截断策略**：
    *   明确限制为默认 **5 行**。
    *   截断时需显示提示信息，例如 `... X more lines hidden (Press ctrl+o to expand) ...`。

## Approach
最终方案决定复用现有的全局 `transcriptMode` 状态，通过新组件统一管理 Bash 输出的展示逻辑。

1.  **统一交互**：不引入新的快捷键，沿用 `Ctrl+O` 切换全局查看模式。
2.  **组件化**：封装通用的折叠逻辑，确保 UI 风格一致。
3.  **定向应用**：通过判断工具名称，仅对 Bash 相关的输出应用此组件。

## Architecture

### 1. 新增组件 `ExpandableOutput`
创建 `src/ui/ExpandableOutput.tsx`：
*   **Props**:
    *   `content`: string (输出内容)
    *   `maxLines`: number (默认 5)
*   **State**: 连接 `useAppStore` 获取 `transcriptMode`。
*   **Render Logic**:
    *   如果 `!transcriptMode` 且行数 > `maxLines`：截取前 `maxLines` 行，并渲染灰色提示文本。
    *   否则：渲染完整内容。

### 2. 组件改造 `src/ui/Messages.tsx`
*   **`BashOutputMessage`**:
    *   直接使用 `ExpandableOutput` 替换原有的 `Text` 渲染逻辑。
*   **`ToolResultItem`**:
    *   增加 `toolName` 属性。
    *   内部逻辑判断：如果 `toolName === 'bash'`，则使用 `ExpandableOutput` 渲染内容；否则保持原有逻辑（显示完整文本或 JSON）。
*   **`ToolPair` / `ToolResult`**:
    *   更新父组件，将 `toolUse.name` 或相关标识传递给 `ToolResultItem`。
