# Bash 工具输出截断逻辑优化

**Date:** 2026-01-09

## Context

当前 `src/tools/bash.ts` 中的 `truncateOutput` 函数使用基于**行数**的截断策略（默认 20 行），这与 `Bash-Tool-Truncation-Analysis.md` 中描述的基于**字符数**的截断逻辑不一致。

分析文档描述的截断逻辑具有以下特点：
- 基于字符数截断（默认 30k，上限 150k）
- 预处理阶段去除首尾空行
- 通过环境变量 `BASH_MAX_OUTPUT_LENGTH` 配置
- 采用"保留头部，丢弃尾部"策略

本次优化旨在将现有实现对齐到分析文档描述的逻辑。

## Discussion

### 截断策略选择

| 选项 | 描述 | 结论 |
|------|------|------|
| 基于字符数 | 默认 30k，最大 150k，能保留更多有效内容 | ✅ 采用 |
| 基于行数 | 当前实现，按行数截断 | ❌ 弃用 |
| 混合策略 | 同时限制行数和字符数 | ❌ 过于复杂 |

### 预处理需求

决定在截断前对输出进行预处理，移除首尾空白行，确保截断基于"有效内容"。

### 配置方式

采用环境变量 `BASH_MAX_OUTPUT_LENGTH` 配置截断阈值，与分析文档保持一致。

### 实现方案

| 方案 | 描述 | 结论 |
|------|------|------|
| 完全对齐 | 3 函数架构 + 图片豁免 | 部分采用 |
| 最小改动 | 改造现有函数 | ❌ |
| 分层架构 | 新建通用模块 | ❌ 过度设计 |

最终决定：采用 3 函数架构，但**不包含图片豁免**功能。

## Approach

实现 3 个独立函数，各司其职：

1. **预处理函数**：去除首尾空行
2. **配置获取函数**：读取环境变量，处理默认值和上限
3. **截断函数**：基于字符数截断，生成截断提示

保持 `truncateOutput` 函数名不变，调用点无需修改。

## Architecture

### 常量定义

```typescript
const DEFAULT_OUTPUT_LIMIT = 30_000;   // 默认 30k 字符
const MAX_OUTPUT_LIMIT = 150_000;      // 硬上限 150k 字符
const ENV_OUTPUT_LIMIT = 'BASH_MAX_OUTPUT_LENGTH';
```

### 函数实现

#### 1. trimEmptyLines

移除输出首尾的空白行，保留中间的空行和缩进格式：

```typescript
function trimEmptyLines(content: string): string {
  const lines = content.split('\n');
  
  let start = 0;
  while (start < lines.length && lines[start].trim() === '') {
    start++;
  }
  
  let end = lines.length - 1;
  while (end > start && lines[end].trim() === '') {
    end--;
  }
  
  return lines.slice(start, end + 1).join('\n');
}
```

#### 2. getMaxOutputLimit

从环境变量读取限制，处理无效值和上限：

```typescript
function getMaxOutputLimit(): number {
  const envValue = process.env[ENV_OUTPUT_LIMIT];
  if (!envValue) return DEFAULT_OUTPUT_LIMIT;
  
  const limit = parseInt(envValue, 10);
  if (isNaN(limit) || limit <= 0) return DEFAULT_OUTPUT_LIMIT;
  
  return Math.min(limit, MAX_OUTPUT_LIMIT);
}
```

#### 3. truncateOutput

基于字符数截断，添加被丢弃行数提示：

```typescript
function truncateOutput(content: string, limit?: number): string {
  const trimmed = trimEmptyLines(content);
  const maxLimit = limit ?? getMaxOutputLimit();
  
  if (trimmed.length <= maxLimit) {
    return trimmed;
  }
  
  const kept = trimmed.slice(0, maxLimit);
  const droppedContent = trimmed.slice(maxLimit);
  const droppedLines = droppedContent.split('\n').length;
  
  return `${kept}\n\n... [${droppedLines} lines truncated] ...`;
}
```

### 调用流程

```
原始输出 → trimEmptyLines() → truncateOutput(内容, getMaxOutputLimit())
```

### 集成点

| 位置 | 用途 | 改动 |
|------|------|------|
| `createBackgroundResult()` | 截断后台任务初始输出 | 无需改动 |
| `formatExecutionResult()` | 截断命令执行结果 | 无需改动 |

### 测试用例

```typescript
describe('truncateOutput', () => {
  it('应移除首尾空行');
  it('小于阈值时不截断');
  it('超过阈值时截断并显示行数');
  it('正确统计被丢弃的行数');
});

describe('getMaxOutputLimit', () => {
  it('无环境变量时返回默认值 30000');
  it('读取有效环境变量');
  it('无效值时回退到默认值');
  it('超过150k时限制为150k');
});
```
