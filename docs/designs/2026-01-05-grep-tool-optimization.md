# Grep Tool 完整功能优化

**Date:** 2026-01-05

## Context

当前 `src/tools/grep.ts` 功能较为基础，仅支持 4 个参数（pattern, search_path, include, limit），只有 `files_with_matches` 输出模式。

参考 `Grep-Tool-Analysis.md` 分析文档（基于 Claude Code 2.0.76），该工具应支持更丰富的功能，包括多种输出模式、上下文行数、大小写控制、文件类型过滤、多行匹配等。

目标是将 grep.ts 完整对齐分析文档的所有功能，同时保持向后兼容。

## Discussion

### 核心问题与决策

1. **优化目标**：选择"完整对齐分析文档"，而非仅添加关键功能或性能优化
2. **API 兼容性**：选择"向后兼容"，保留现有参数名（search_path, include, limit），新增参数作为可选项
3. **实现方案**：选择"方案 A：单文件扩展"，直接在 grep.ts 中扩展，改动集中，简单直接
4. **pattern 参数**：保持必填，符合 grep 工具语义

### 探索的替代方案

- **方案 B：分层架构** - 将 ripgrep 封装逻辑提取到工具库，职责分离但需修改多个文件
- **方案 C：配置驱动** - 高度可扩展但过度设计

## Approach

采用单文件扩展方案，在现有 `grep.ts` 中添加所有缺失功能：

1. 扩展 zod schema 定义新参数
2. 根据 output_mode 构建不同的 ripgrep 参数
3. 解析不同模式的输出格式
4. 添加错误处理机制（EAGAIN 重试）

## Architecture

### 参数定义

| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `pattern` | string | (必填) | 正则表达式搜索模式 |
| `search_path` | string | cwd | 搜索路径 |
| `include` | string | - | glob 过滤模式 |
| `limit` | number | 1000 | 最大返回文件数 |
| `output_mode` | enum | `"files_with_matches"` | 输出模式：content/files_with_matches/count |
| `before_context` | number | - | 匹配行之前的行数 (rg -B) |
| `after_context` | number | - | 匹配行之后的行数 (rg -A) |
| `context` | number | - | 匹配行前后的行数 (rg -C) |
| `line_numbers` | boolean | true | 显示行号 (rg -n) |
| `ignore_case` | boolean | false | 大小写不敏感 (rg -i) |
| `type` | string | - | 文件类型过滤 (rg --type) |
| `multiline` | boolean | false | 多行模式 (rg -U --multiline-dotall) |
| `offset` | number | 0 | 跳过前 N 条结果 |

### 输出结构

```typescript
// files_with_matches 模式
{ mode: "files_with_matches", numFiles, filenames, appliedLimit?, appliedOffset? }

// content 模式
{ mode: "content", numFiles, filenames, content, numLines, appliedLimit?, appliedOffset? }

// count 模式
{ mode: "count", numFiles, filenames, numMatches }
```

### ripgrep 参数映射

```
基础参数：--hidden, --glob !.git/.svn/.hg/.bzr, --max-columns 500
multiline      → -U --multiline-dotall
ignore_case    → -i
line_numbers   → -n (仅 content 模式)
before_context → -B N (仅 content 模式)
after_context  → -A N (仅 content 模式)
context        → -C N (仅 content 模式)
output_mode    → -l (files) / -c (count) / (无，content)
type           → --type TYPE
include        → --glob PATTERN
pattern 以 '-' 开头 → -e pattern
```

### 错误处理

1. **路径不存在**：验证时返回错误
2. **无匹配**：rg exit code 1，返回空结果
3. **EAGAIN**：检测 "os error 11"，使用 `-j 1` 单线程重试
4. **权限错误**：抛出异常

### 文件变更

| 文件 | 变更 |
|------|------|
| `src/tools/grep.ts` | 扩展参数和执行逻辑 |
| `src/utils/ripgrep.ts` | 可能需要扩展错误处理 |

### 测试覆盖

- 基础搜索回归测试
- 三种输出模式测试
- 上下文参数测试
- 文件过滤测试（type + include）
- 多行模式测试
- 分页测试（limit + offset）
- 大小写测试
- 边界情况（pattern 以 `-` 开头、路径不存在、无匹配）
