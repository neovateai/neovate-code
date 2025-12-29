# DiffViewer 增强显示功能

**Date:** 2025-12-29

## Context

当前 `src/ui/DiffViewer.tsx` 的显示比较初版，存在以下需要改进的地方：

1. **展示内容不足**：在 `AskQuestionModal.tsx` 中调用时应该展示更多内容，但目前没有差异化配置
2. **缺少合理阈值**：超长内容没有区分场景的显示策略
3. **展开机制缺失**：无法通过快捷键（Ctrl+O）查看全部内容
4. **新建文件展示问题**：新建文件仍以 diff 形式展示（绿色 + 号），不支持语法高亮，可读性差

在 `Messages.tsx` 中需要保持现状展示部分内容，在 `AskQuestionModal.tsx` 中需要展示更多详细信息，同时两者都应该支持通过 Ctrl+O 查看完整内容。

## Discussion

### 关键问题与决策

**1. 语法高亮实现方式**
- **问题**：新建文件应该用什么方式进行语法高亮？
- **决策**：复用现有的 `src/ui/Markdown.tsx` 组件，利用 `marked-terminal` 的代码块高亮能力，无需引入额外的 `cli-highlight` 库
- **理由**：最小依赖原则，现有工具链已满足需求

**2. 显示行数阈值**
- **问题**：不同场景下应该显示多少行？
- **决策**：
  - `AskQuestionModal`：500 行（详细展示）
  - `Messages`：10 行（简洁展示）
- **理由**：Modal 场景用户关注细节，消息流场景需要保持简洁

**3. 展开控制机制**
- **问题**：如何实现 Ctrl+O 查看全部内容？
- **探索的方案**：
  - 方案 A：复用现有 `transcriptMode`，全局切换所有 diff 展开/折叠
  - 方案 B：为每个 DiffViewer 添加独立展开状态
- **决策**：选择方案 A（复用 transcriptMode）
- **理由**：改动最小，架构一致性好，已在 `AgentProgressOverlay` 中验证可行

**4. 总体设计方向**
- **探索的三个方案**：
  1. **最小改动方案**：扩展 DiffViewer 参数，复用现有基础设施
  2. **独立组件方案**：创建新的 CodeViewer 组件，关注点分离
  3. **智能引擎方案**：统一的 FileContentViewer，支持多种渲染模式
- **最终选择**：方案一（最小改动方案）
- **权衡**：在满足需求的前提下，优先考虑 YAGNI 原则和快速落地

## Approach

采用**最小改动方案**，通过以下方式增强 DiffViewer：

1. **接口扩展**：为 DiffViewer 添加 `maxHeight` 和 `useCodeHighlight` 参数
2. **场景区分**：调用方传入不同的 `maxHeight` 值区分场景
3. **语法高亮**：对新建文件使用 Markdown 代码块渲染，支持自动语言推断
4. **展开控制**：复用全局 `transcriptMode` 状态，通过 Ctrl+O 切换

**核心优势**：
- 改动最小，风险可控
- 复用现有基础设施（Markdown、transcriptMode）
- 不引入新的状态管理复杂度
- 快速可落地

## Architecture

### 组件接口调整

```typescript
// DiffViewer.tsx
interface DiffProps {
  originalContent: string;
  newContent: string;
  fileName?: string;
  maxHeight?: number;        // 新增：控制显示行数
  terminalWidth?: number;
  useCodeHighlight?: boolean; // 新增：是否对新文件使用语法高亮
}
```

### 渲染逻辑分支

```typescript
export function DiffViewer({ useCodeHighlight = true, ... }: DiffProps) {
  const { transcriptMode } = useAppStore();
  
  const diffLines = useMemo(...);
  const isNew = isNewFile(diffLines);
  
  // 新建文件 + 开启语法高亮 → 使用 CodeHighlightRenderer
  if (isNew && useCodeHighlight) {
    const content = extractNewFileContent(diffLines);
    return (
      <CodeHighlightRenderer
        content={content}
        fileName={fileName}
        maxHeight={transcriptMode ? Infinity : (maxHeight || DEFAULT_MAX_HEIGHT)}
        terminalWidth={terminalWidth || DEFAULT_TERMINAL_WIDTH}
      />
    );
  }
  
  // 否则使用原有 diff 逻辑
  return RenderDiffContent(...);
}
```

### 语法高亮渲染器

**CodeHighlightRenderer 组件**：

```typescript
function CodeHighlightRenderer({
  content,
  fileName,
  maxHeight,
  terminalWidth,
}: {
  content: string;
  fileName?: string;
  maxHeight: number;
  terminalWidth: number;
}) {
  // 1. 从文件名推断语言
  const language = inferLanguage(fileName);
  
  // 2. 处理截断
  const lines = content.split('\n');
  const shouldTruncate = lines.length > maxHeight;
  const visibleLines = shouldTruncate ? lines.slice(0, maxHeight) : lines;
  const hiddenCount = lines.length - visibleLines.length;
  
  // 3. 构造 Markdown 代码块
  const markdownContent = `\`\`\`${language}\n${visibleLines.join('\n')}\n\`\`\``;
  
  return (
    <Box flexDirection="column" width={terminalWidth}>
      {fileName && (
        <Box paddingX={1}>
          <Text bold>{fileName}</Text>
          <Text color="green"> (new file)</Text>
        </Box>
      )}
      
      <Markdown>{markdownContent}</Markdown>
      
      {shouldTruncate && (
        <Box paddingX={1}>
          <Text color="gray">
            ... {hiddenCount} more lines hidden (Press Ctrl+O to expand) ...
          </Text>
        </Box>
      )}
    </Box>
  );
}
```

**语言推断函数**：

```typescript
function inferLanguage(fileName?: string): string {
  if (!fileName) return 'text';
  
  const ext = fileName.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'bash',
  };
  
  return languageMap[ext || ''] || 'text';
}
```

### 调用方集成

**Messages.tsx 中的调用**：

```typescript
function ToolResultItem({ part }: { part: ToolResultPart }) {
  const { transcriptMode } = useAppStore();
  const { result, input } = part;
  
  if (result.returnDisplay?.type === 'diff_viewer') {
    const { originalContent, newContent, filePath } = result.returnDisplay;
    const originalContentValue = /* ... */;
    const newContentValue = /* ... */;
    
    return (
      <DiffViewer
        originalContent={originalContentValue}
        newContent={newContentValue}
        fileName={filePath}
        maxHeight={transcriptMode ? Infinity : 10}  // 折叠时显示 10 行
        useCodeHighlight={true}                      // 开启语法高亮
      />
    );
  }
}
```

**AskQuestionModal.tsx 中的调用**：

```typescript
function SomeDiffDisplay() {
  const { transcriptMode } = useAppStore();
  
  return (
    <DiffViewer
      originalContent={...}
      newContent={...}
      fileName={...}
      maxHeight={transcriptMode ? Infinity : 500}  // 折叠时显示 500 行
      useCodeHighlight={true}
    />
  );
}
```

### 展开控制机制

**全局状态复用**：

- `transcriptMode` 已在 `App.tsx` 中通过 Ctrl+O 快捷键控制
- 所有 DiffViewer 通过 `useAppStore()` 获取该状态
- 当 `transcriptMode = true` 时，`maxHeight` 自动设为 `Infinity`
- 切换时所有视图同步响应

**提示文案**：

```typescript
{shouldTruncate && !transcriptMode && (
  <Box paddingX={1}>
    <Text color="gray" dimColor>
      ... {hiddenCount} more lines hidden (Press Ctrl+O to expand) ...
    </Text>
  </Box>
)}
```

### 边界情况处理

**1. 空文件检测**：
```typescript
if (!content || content.trim() === '') {
  return <Text dimColor>Empty file</Text>;
}
```

**2. 超大文件保护**：
```typescript
const MAX_HIGHLIGHT_LINES = 10000;
if (lines.length > MAX_HIGHLIGHT_LINES && !transcriptMode) {
  // 降级为纯文本显示，避免渲染崩溃
}
```

**3. 回退策略**：
如果 Markdown 代码高亮效果不理想，可快速回退到原有绿色文本显示，只需将 `useCodeHighlight` 默认值改为 `false`。

### 实现顺序

1. 在 `DiffViewer.tsx` 中实现 `CodeHighlightRenderer` 和 `inferLanguage`
2. 调整 `DiffViewer` 接口，添加新参数和分支逻辑
3. 修改 `Messages.tsx` 中的调用点
4. 修改 `AskQuestApprovalModalionModal.tsx` 中的调用点（如有）
5. 测试各种场景（新文件、修改文件、展开折叠、不同语言）

### 技术依赖

- **现有依赖**：`marked`、`marked-terminal`（已安装）
- **新增依赖**：无
- **全局状态**：`transcriptMode`（已存在于 store）

### 测试场景

- [ ] 新建文件显示（多种语言：.ts, .py, .go 等）
- [ ] 修改文件的 diff 显示（保持原有逻辑）
- [ ] Messages 中显示 10 行 + 折叠提示
- [ ] ApprovalModal 中显示 500 行
- [ ] Ctrl+O 切换展开/折叠
- [ ] 空文件、超大文件边界情况
