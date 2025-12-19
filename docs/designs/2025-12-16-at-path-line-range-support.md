# @ 路径行号范围支持

**Date:** 2025-12-16

## Context

当前的 `At` 类支持通过 `@path/to/file` 语法引用文件并将完整内容嵌入到 XML 中。然而，在许多场景下，用户只需要查看文件的特定行范围，而不是整个文件内容。这个功能的需求是：

- 支持 `@path/to/file:10` 语法来读取单行（第 10 行）
- 支持 `@path/to/file:10-20` 语法来读取行范围（第 10 到 20 行，包含两端）
- 在 XML 输出中保留原始文件的行号，方便用户定位代码位置
- 只将指定的行范围内容传入，而不是读取全文

## Discussion

### 行为定义
经过讨论明确了以下行为：
- `@src/at.ts:10-20` → 读取第 10-20 行（包含第 10 行和第 20 行）
- `@src/at.ts:10` → 只读取第 10 行

### 行号显示
行号信息仅在 metadata 中显示，内容本身不带行号前缀。metadata 会清楚标注读取的行范围（如 `Lines 10-20 of 189 total lines`），这样既简洁又能让用户准确知道当前查看的内容范围。

### 方案选择
考虑了三种实现方案：

1. **正则扩展方案**（已选择）：扩展现有正则表达式，解析路径和行号范围，在 `processFileContent` 中处理行号切片
   - 优点：复用现有逻辑，改动最小，易于维护
   - 缺点：需要在多处传递行号信息
   - 复杂度：低

2. **专用解析器方案**：创建独立的 `AtPathParser` 类处理路径和行号解析
   - 优点：职责分离清晰，易于扩展和测试
   - 缺点：增加代码复杂度，可能过度设计
   - 复杂度：中

3. **混合元数据方案**：在 `renderFilesToXml` 阶段处理行号信息，在 metadata 中记录范围
   - 优点：metadata 信息更丰富
   - 缺点：数据流复杂度增加
   - 复杂度：中

最终选择**方案 1（正则扩展方案）**，因为它保持了代码简洁性，改动最小，且完全满足功能要求。

## Approach

采用正则扩展方案，核心思路是：

1. 扩展 `extractAtPaths` 方法的返回值，从简单的路径字符串数组改为包含路径和可选行号范围的对象数组
2. 修改正则表达式以支持 `:行号` 和 `:行号-行号` 语法
3. 在文件内容处理流程中传递行号范围信息
4. 在 `processFileContent` 方法中根据行号范围进行内容切片
5. 保持向后兼容：无行号语法时保持现有全文读取行为

## Architecture

### 数据结构变更

```typescript
// 新增类型定义
interface AtPath {
  path: string;
  lineRange?: {
    start: number;  // 起始行号（包含）
    end?: number;   // 结束行号（包含），undefined 表示只读取单行
  };
}
```

### 核心改动点

#### 1. `extractAtPaths` 方法
- **当前返回**：`string[]`（仅路径）
- **改为返回**：`AtPath[]`（路径 + 可选行号范围）
- **正则表达式扩展**：
  ```typescript
  const regex = /@("(?<quoted>[^"]+)"|(?<unquoted>(?:[^\\ ]|\\ )+))(?::(?<lineRange>\d+(?:-\d+)?))?/g
  ```
- **解析逻辑**：
  - `:10` → `{ start: 10, end: 10 }`
  - `:10-20` → `{ start: 10, end: 20 }`
  - 无 `:` → `lineRange` 为 `undefined`

#### 2. 数据流调整

```
用户输入 "@src/at.ts:10-20"
  ↓
extractAtPaths 解析 → [{ path: "src/at.ts", lineRange: { start: 10, end: 20 } }]
  ↓
getContent 处理每个路径对象（携带 lineRange）
  ↓
renderFilesToXml 接收带 lineRange 的文件路径
  ↓
processFileContent 根据 lineRange 切片内容
  ↓
XML 输出（metadata 中包含行范围信息，内容为纯文本）
```

#### 3. `processFileContent` 方法改造

添加可选参数 `lineRange`：

```typescript
private processFileContent(
  content: string,
  lineRange?: { start: number; end?: number }
): {
  content: string;
  metadata: string;
}
```

处理逻辑：
- 如果 `lineRange` 存在，从所有行中切片出指定范围
- 行号从 1 开始计数（与编辑器一致）
- 行号信息仅在 metadata 中显示（不添加行号前缀到内容）
- metadata 显示格式：`Lines 10-20 of 189 total lines` 或 `Line 10 of 189 total lines`（单行）

#### 4. `renderFilesToXml` 方法调整

- 接收 `AtPath[]` 而非 `string[]`
- 将 `lineRange` 信息传递给 `processFileContent`
- XML 输出中的 metadata 反映实际读取的行范围

### 向后兼容性

- 现有无 `:` 语法的调用完全不受影响
- `lineRange` 为 `undefined` 时，保持原有全文读取逻辑
- 所有现有测试用例应继续通过

### 边界情况处理

- 行号超出文件总行数：截断到文件末尾
- 起始行号大于结束行号：视为无效，返回错误或空内容
- 行号为 0 或负数：视为无效输入
- 文件过大限制（MAX_LINES_TO_READ）：优先应用行号范围，再应用大小限制
