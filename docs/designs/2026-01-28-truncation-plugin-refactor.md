# Truncation 插件化重构

**Date:** 2026-01-28

## Context

当前 `src/compression.ts` 中的 `Compression.truncate()` 是一个纯函数实现，存在以下问题：

1. **未与工具执行流程集成**：truncate 函数只是一个工具函数，没有自动应用到工具输出
2. **不支持无损保存**：截断时不会将完整输出保存到本地文件
3. **不符合插件化架构**：没有使用项目现有的插件机制

根据 `Truncation截断机制详细实现文档.md` 的设计，需要通过插件机制的 `toolResult` hook 实现更完善的 Truncation 能力，参考 `src/plugins/notification.ts` 的插件模式。

## Discussion

### 关键问题与决策

1. **存储位置**
   - 选项：项目工作目录、全局数据目录、临时目录
   - **决策**：全局数据目录 (~/.takumi/tool-output/)，跨项目共享

2. **清理机制**
   - 选项：Scheduler 定时清理、随机概率清理、不自动清理
   - **决策**：不自动清理，由用户或系统自行管理

3. **插件定位**
   - 选项：新建独立文件、复用并改造 compression.ts、内联在 project.ts
   - **决策**：新建独立文件 `src/plugins/truncation.ts`，责任边界清晰

4. **旧代码处理**
   - 选项：删除旧逻辑、保留并标记 deprecated、复用作为内部工具
   - **决策**：删除旧 truncate 逻辑，避免维护两套代码

5. **设计方案选择**
   - 方案 A：纯 Hook 实现，所有工具统一截断
   - 方案 B：Hook + 工具协作机制，支持工具自定义截断
   - **决策**：方案 B，通过 `truncated` 标记实现工具协作，更符合文档设计

6. **配置开关**
   - 需要支持通过配置关闭 truncation 功能，实现最小影响
   - 添加 `truncation?: boolean` 配置项

## Approach

通过插件机制的 `toolResult` hook 拦截工具执行结果，实现自动截断：

1. **插件拦截**：在工具执行后，通过 `toolResult` hook 检查输出大小
2. **智能跳过**：如果工具已设置 `truncated` 标记，则跳过自动处理
3. **无损保存**：超限时保存完整内容到本地文件，返回截断预览
4. **配置控制**：支持通过 `truncation: false` 配置关闭功能

### 核心流程

```
工具执行 → ToolResult → 插件 toolResult hook → 
  - 若 truncated 已定义 → 跳过处理
  - 若 truncation 配置为 false → 跳过处理
  - 若未超限 → 标记 truncated: false
  - 若超限 → 截断 + 保存文件 + 返回修改后的 ToolResult
```

## Architecture

### 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/plugins/truncation.ts` | 新建 | Truncation 插件主体 |
| `src/tool.ts` | 修改 | ToolResult 类型添加 `truncated`、`outputPath` 字段 |
| `src/context.ts` | 修改 | 导入并注册 truncationPlugin |
| `src/config.ts` | 修改 | 添加 `truncation?: boolean` 配置项 |
| `src/compression.ts` | 删除部分 | 移除 `truncate` 函数和 `TruncateResult` 类型 |

### ToolResult 类型扩展

```typescript
// src/tool.ts
export type ToolResult = {
  llmContent: string | (TextPart | ImagePart)[];
  returnDisplay?: ReturnDisplay;
  isError?: boolean;
  metadata?: { ... };
  
  // 新增字段
  truncated?: boolean;     // 是否已截断
  outputPath?: string;     // 完整输出文件路径
};
```

### 插件核心实现

```typescript
// src/plugins/truncation.ts
export const truncationPlugin: Plugin = {
  name: 'truncation',
  enforce: 'post',
  
  async toolResult(toolResult, opts) {
    // 检查是否禁用
    if (this.config.truncation === false) {
      return toolResult;
    }
    
    // 工具已自行处理
    if (toolResult.truncated !== undefined) {
      return toolResult;
    }
    
    // 错误结果不截断
    if (toolResult.isError) {
      return toolResult;
    }
    
    // 检查大小并执行截断
    // ...
  },
};
```

### 配置项

```typescript
// src/config.ts
export type Config = {
  // ...
  truncation?: boolean;  // 默认 true
};
```

### 边界情况处理

| 场景 | 处理方式 |
|------|---------|
| 错误结果 (`isError: true`) | 跳过截断 |
| 工具已设置 `truncated` | 跳过截断 |
| llmContent 是数组（含图片） | 仅处理文本部分 |
| 内容恰好在边界 | `<=` 判断，不截断 |
| 输出目录不存在 | 自动创建 |
| 文件写入失败 | 记录日志，降级返回截断内容 |

### 用户配置方式

```bash
# 全局关闭
takumi config set truncation false

# 项目级配置 (.takumi/config.json)
{ "truncation": false }
```
