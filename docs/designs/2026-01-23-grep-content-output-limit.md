# Grep Content 模式输出限制

**Date:** 2026-01-23

## Context

当前 `grep` 工具在 `content` 模式下（特别是配合 `context` 参数使用时）可能返回大量内容，导致 LLM 上下文爆炸。

例如以下调用：
```json
{
  "toolName": "grep",
  "input": {
    "pattern": "input|textarea",
    "path": "src",
    "output_mode": "content",
    "context": 2
  }
}
```

相比之下，`read.ts` 已有完善的限制机制：
- `MAX_LINES_TO_READ = 2000`（行数限制）
- `MAX_LINE_LENGTH = 2000`（单行长度限制）
- `MAX_FILE_LENGTH = 262144`（总字符数限制）
- `MAX_TOKENS = 25000`（token 限制）

而 `grep.ts` 在 `content` 模式下的限制较弱，只有 `DEFAULT_LIMIT = 1000` 限制返回的行/文件数，缺乏总字符数和 token 限制。

## Discussion

### 限制策略选择

讨论了三种限制策略：
1. **Token 限制优先** - 以 MAX_TOKENS 作为主要限制
2. **行数 + 字符数限制** - 类似 read.ts 的方式
3. **综合限制** - 同时检查行数、字符数、token 数

**结论：** 选择综合限制策略，任一超限则触发限制。

### 超限行为处理

讨论了三种超限处理方式：
1. **直接报错（严格）** - 强制用户缩小搜索范围
2. **截断 + 提示（宽松）** - 返回部分结果并提示被截断
3. **截断 + 引导（推荐）** - 返回部分结果 + 明确提示如何缩小范围/使用 offset

**结论：** 采用截断 + 引导方式，给模型提供足够信息。

### 阈值设定

讨论了是否调整阈值：
- 完全对齐 read.ts
- 略微调低（考虑 grep 返回多文件的特点）

**结论：** 完全对齐 read.ts 的阈值，保持一致性。

### 实现方案

讨论了三种实现方案：

| 方案 | 描述 | 复杂度 |
|------|------|--------|
| A: 后置校验 | ripgrep 执行后校验截断 | 低 |
| B: 前置+后置 | 使用 --max-count 前置限制 + 后置校验 | 中 |
| C: 流式处理 | 流式读取，达到阈值立即停止 | 高 |

**结论：** 选择方案 A（后置校验），实现简单，改动最小，与 read.ts 逻辑一致。

## Approach

采用**后置校验 + 截断引导**方案：

1. 让 ripgrep 正常执行获取结果
2. 在返回前进行综合校验（行数、字符数、token 数）
3. 超限时截断内容，并在返回中提供引导信息
4. 仅影响 `content` 模式，`files_with_matches` 和 `count` 模式保持不变

## Architecture

### 改动文件

`src/tools/grep.ts`

### 新增常量

```typescript
const MAX_CONTENT_LINES = 2000;      // 最大返回行数
const MAX_LINE_LENGTH = 2000;         // 单行最大长度  
const MAX_CONTENT_LENGTH = 262144;    // 总字符数限制 (~256KB)
const MAX_TOKENS = 25000;             // token 数限制
```

### 新增依赖

```typescript
import { countTokens } from 'gpt-tokenizer';  // 已在项目中使用
```

### 校验流程（仅 content 模式）

```
1. 行数限制：slicedLines.length > MAX_CONTENT_LINES → 截断到 2000 行
2. 单行截断：每行超过 2000 字符 → 截断 + "..."
3. 字符数限制：content.length > MAX_CONTENT_LENGTH → 逐行减少直到满足
4. Token 限制：countTokens(content) > MAX_TOKENS → 逐行减少直到满足
```

### 返回结果增强

```typescript
llmContent: safeStringify({
  mode: 'content',
  numFiles: filenames.length,
  filenames,
  content,
  numLines: slicedLines.length,
  // 新增字段
  truncated: true,                           // 是否被截断
  totalLinesBeforeTruncation: allLines.length,  // 截断前总行数
  hint: 'Results truncated. Use more specific pattern, add include filter, or use offset parameter.',
})
```

### 不改动的部分

- `files_with_matches` 模式（只返回文件名列表，数据量可控）
- `count` 模式（只返回数字，数据量极小）
- 参数定义保持不变
