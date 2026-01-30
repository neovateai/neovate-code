# 自动压缩策略优化设计

**Date:** 2026-01-27  
**Status:** ✅ Implemented (Compaction & Pruning)  
**Related PR:** 
- [#718 - Truncation Plugin](https://github.com/neovateai/neovate-code/pull/718) ✅ Merged
- Current PR - Compaction & Pruning Strategy

## Implementation Status

### ✅ Completed in PR #718 (Truncation Plugin)
- **Truncation 截断机制**：工具输出自动截断，已作为独立 plugin 实现
- 在工具执行层自动应用，限制单次输出大小
- 配置参数：`maxLines=2000`, `maxBytes=50KB`, `direction='head'`

### ✅ Completed in Current PR (Compaction & Pruning)
- **Compaction 压缩机制**：优化触发逻辑，简化溢出判断
- **Pruning 修剪机制**：历史工具输出智能修剪
- **统一配置管理**：`compression.ts` 模块管理压缩策略配置

### 🎯 Architecture Decision
由于 Truncation 已在 PR #718 中作为独立 plugin 实现，本 PR 专注于：
1. Compaction 触发逻辑优化
2. Pruning 策略实现
3. 压缩配置统一管理（不包括 Truncation 配置）

## Context

当前项目的 `src/history.ts` 实现了基础的会话压缩功能，但与 Opencode 的成熟三层压缩策略相比存在差距：

**现有实现的问题：**
1. **单一压缩机制**：只有 Session Compaction（会话总结压缩）
2. **触发条件复杂**：基于固定阈值和比例计算的逻辑较为复杂
3. **无 Pruning 机制**：没有历史工具输出修剪功能
4. **无 Truncation 机制**：没有工具输出截断功能

**参考方案 (Opencode) 的设计理念：** "掐头去尾，限宽保质"
- **掐头 (Compaction)**: 将久远的对话历史压缩成摘要
- **去尾 (Pruning)**: 丢弃历史中不再重要的工具输出细节
- **限宽 (Truncation)**: 限制单次工具输出的数据量

## Discussion

### 优化目标选择

讨论了四种优化方向：
1. 引入完整三层策略
2. 仅优化 Compaction 触发逻辑
3. 添加 Pruning 机制
4. 全面重构对齐 Opencode

**最终决定**：全面重构对齐 Opencode 的架构设计。

### 代码组织方式

探讨了三种组织方式：
1. 集中在 history.ts
2. 拆分为多个独立模块
3. 混合模式

**最终决定**：采用混合模式 - 保持 `history.ts` 作为入口，但逻辑分散到专门模块。同时尽量精简文件数量，不要新增太多文件。

### 配置设计

讨论了配置的灵活程度：
1. 完全可配置
2. 固定参数
3. 简单开关

**最终决定**：完全可配置，支持 `auto`、`prune` 等开关，参数可自定义。

### 架构方案选择

对比了三种架构方案：

| 方案 | 核心思想 | 优点 | 缺点 | 复杂度 |
|------|----------|------|------|--------|
| A: 事件驱动 | 通过事件总线解耦 | 高度解耦，易扩展 | 增加复杂度，调试困难 | ⭐⭐⭐⭐ |
| B: 管道式处理 | 三层策略按顺序执行 | 清晰易理解 | 阶段间隐式依赖 | ⭐⭐⭐ |
| C: 策略+门面 | History 作为门面，委托给策略对象 | 与 Opencode 最接近，简洁 | 需要统一接口 | ⭐⭐ |

**最终决定**：采用方案 C（策略模式 + 门面模式），与 Opencode 设计最接近。

## Approach

### 设计理念

采用**策略模式 + 门面模式**，实现三层压缩策略：

```
"掐头去尾，限宽保质"

┌─────────────────────────────────────────────────────────┐
│                   History（门面入口）                     │
│                      history.ts                         │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────────┐
    │Truncation│   │ Pruning  │   │ Compaction   │
    │（限宽）   │   │（去尾）   │   │（掐头）       │
    └──────────┘   └──────────┘   └──────────────┘
         │               │               │
    工具执行层        compression.ts    compact.ts
```

### 三层策略职责

| 策略 | 职责 | 触发时机 | 关键参数 |
|------|------|----------|----------|
| **Truncation** | 限制单次工具输出大小 | 工具返回时 | maxLines=2000, maxBytes=50KB |
| **Pruning** | 修剪历史工具输出 | 压缩前 | protectThreshold=40k, minimumPrune=20k |
| **Compaction** | 生成会话摘要 | Token 溢出时 | outputTokenMax=4096 |

## Architecture

### 文件结构（精简版）

```
src/
├─ history.ts          # 门面入口，保持 API 稳定
├─ compact.ts          # 保留现有 compaction LLM 调用
├─ compression.ts      # 新增：统一管理 Compaction & Pruning 策略配置
└─ constants.ts        # 新增压缩相关常量
```

**注意**：Truncation 已在 PR #718 中作为独立 plugin (`src/plugins/truncation.ts`) 实现。

### compression.ts 内部组织

```typescript
export namespace Compression {
  // === 配置 ===
  export interface CompressionConfig { 
    compaction: { ... };
    pruning: { ... };
    // 注意：truncation 配置在 src/plugins/truncation.ts 中管理
  }
  export const DEFAULT_CONFIG: CompressionConfig = { ... }
  
  // === Pruning ===  
  export function prune(messages, config): PruneResult { ... }
  
  // === 工具函数 ===
  export function isOverflow(tokens, modelLimit, config): boolean { ... }
}
```

**注意**：`Compression.truncate()` 功能已在 `src/plugins/truncation.ts` 中独立实现。

### 配置结构

```typescript
export interface CompressionConfig {
  compaction: {
    auto: boolean;              // 是否启用自动压缩，默认 true
    outputTokenMax: number;     // 预留输出 Token，默认 4096
    autoContinue: boolean;      // 压缩后自动继续，默认 true
    triggerRatio: number;       // 触发压缩的比例阈值，默认 0.7 (70%)
  };
  pruning: {
    enabled: boolean;           // 是否启用修剪，默认 true
    protectThreshold: number;   // 保护阈值，默认 40000
    minimumPrune: number;       // 最小修剪量，默认 20000
    protectedTools: string[];   // 受保护工具，默认 ['skill', 'task']
    protectTurns: number;       // 保护轮数，默认 2
  };
  // 注意：truncation 配置已移至 src/plugins/truncation.ts
}
```

### 核心流程

```
History.compress(model, config)
    │
    ├─ 1. 检查 config.compaction.auto
    │
    ├─ 2. 计算 Token 使用量（使用最后一次 assistant 响应的 usage）
    │
    ├─ 3. isOverflow() 判断
    │      └─ 简化公式：currentInputTokens > context * triggerRatio
    │      └─ triggerRatio 默认 0.7 (当使用超过 70% 时触发)
    │
    ├─ 4. [需要压缩] 先执行 Pruning
    │      └─ 保护最近 2 轮 + 40k Token
    │      └─ 修剪量 > 20k 才执行
    │
    ├─ 5. 重新检查是否仍需 Compaction
    │
    └─ 6. [仍需压缩] 调用 compact() 生成摘要
```

**注意**：Truncation 在工具执行层（`src/tool.ts`）自动应用，不在此流程中。

### Pruning 详细设计

**核心参数：**
```typescript
export const PRUNE_CONFIG = {
  PROTECT_THRESHOLD: 40_000,  // 保护阈值：最近 40k Token 内容不修剪
  MINIMUM_PRUNE: 20_000,      // 最小修剪量：小于此值不执行
  PROTECT_TURNS: 2,           // 保护最近 2 轮对话
  PROTECTED_TOOLS: ['skill', 'task'], // 受保护工具列表
};
```

**修剪算法：**
1. 倒序遍历消息（从最新到最旧）
2. 跳过最近 N 轮对话（默认 2 轮）
3. 累计工具输出的 Token 数
4. 当累计 Token > PROTECT_THRESHOLD 时，后续工具输出被标记为待修剪
5. 只有当待修剪量 > MINIMUM_PRUNE 时才实际执行
6. 遇到已修剪过的部分，停止遍历

**修剪效果：**
- 被修剪的工具输出内容替换为：`[Output pruned at {timestamp}]`
- 保留工具调用的元数据（toolName, input, timestamp 等）
- 设置 `pruned: true` 和 `prunedAt: timestamp` 标记

### Truncation 详细设计

**⚠️ 注意**：Truncation 已在 [PR #718](https://github.com/neovateai/neovate-code/pull/718) 中作为独立 plugin 实现，位于 `src/plugins/truncation.ts`。

本 PR 不包含 Truncation 实现，仅作为参考说明：

**核心参数：**
```typescript
// 位于 src/constants.ts (由 PR #718 添加)
export const TRUNCATE_MAX_LINES = 2000;
export const TRUNCATE_MAX_BYTES = 50 * 1024;
export const TRUNCATE_DIRECTION = 'head';
export const TRUNCATE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
```

**工作方式：**
- 在工具执行层（`src/tool.ts`）自动应用
- 通过 plugin 系统注册和执行
- 详见 `src/plugins/truncation.ts` 和 `src/plugins/truncation.test.ts`

### Compaction 优化

**溢出判断简化（核心改进）：**

之前的逻辑较为复杂，需要计算 `usableInput = context - reservedOutput`。新设计采用更直观的触发比例：

```typescript
export function isOverflow(
  tokens: { input: number; output: number; cacheRead?: number },
  modelLimit: { context: number; output: number },
  config: CompressionConfig
): boolean {
  if (!config.compaction.auto) return false;
  
  const context = modelLimit.context;
  if (context === 0) return false;
  
  // 计算当前输入 Token 使用量（input + cacheRead）
  const currentInputTokens = tokens.input + (tokens.cacheRead || 0);
  
  // 基于 TOTAL context window 计算压缩阈值
  // triggerRatio = 0.7 表示：当使用 >70% 时触发（剩余 <30%）
  const compressionThreshold = context * config.compaction.triggerRatio;
  
  return currentInputTokens > compressionThreshold;
}
```

**关键改进点：**
1. **直观的触发条件**：`triggerRatio = 0.7` 表示使用超过 70% 时触发
2. **简化计算**：不再需要 `usableInput` 等中间变量
3. **可配置阈值**：用户可自定义触发比例（0.5 ~ 0.9）
4. **使用 totalTokens**：通过最后一次 assistant 响应的 usage 计算

**Token 使用量获取：**
```typescript
#getLastAssistantUsage(): Usage {
  // 单次遍历查找当前 session 内最后一次 assistant 消息
  // 返回其 usage 信息（promptTokens + completionTokens）
  // 这代表了上一轮对话后的实际 context 使用量
}
```

### 实施步骤

#### ✅ 已完成（本 PR）

1. **创建 `compression.ts`**
   - 定义 `CompressionConfig` 接口（compaction + pruning）
   - 实现 `isOverflow()` 溢出判断函数
   - 实现 `Compression.prune()` 修剪逻辑
   - 导出 `DEFAULT_CONFIG` 默认配置

2. **更新 `message.ts`**
   - 为 `ToolResultPart2` 添加 `pruned?: boolean` 和 `prunedAt?: number` 字段
   - 支持标记和追踪被修剪的工具输出

3. **重构 `history.ts`**
   - 集成 `Compression.prune()` 到 `compress()` 流程
   - 优化 `isOverflow()` 触发逻辑
   - 添加 `#getLastAssistantUsage()` 私有方法
   - 支持传入 `compressionConfig` 参数

4. **添加常量定义**
   - 在 `constants.ts` 中添加压缩策略常量
   - `COMPACTION_OUTPUT_TOKEN_MAX`, `COMPACTION_TRIGGER_RATIO`
   - `PRUNE_PROTECT_THRESHOLD`, `PRUNE_MINIMUM`, `PRUNE_PROTECT_TURNS`, `PRUNE_PROTECTED_TOOLS`

5. **测试覆盖**
   - `compression.test.ts`: 测试 isOverflow、prune 等核心逻辑
   - `history.test.ts`: 测试 History 类的压缩流程

#### ✅ 已在 PR #718 完成

- **Truncation Plugin 实现**
  - `src/plugins/truncation.ts`
  - `src/plugins/truncation.test.ts`
  - 在 `src/tool.ts` 中集成 plugin 系统

#### 🔮 未来可选优化

- 支持用户自定义压缩配置（通过配置文件）
- 添加压缩统计和监控（压缩次数、节省的 Token 数等）
- 优化 Compaction 的摘要质量（改进 prompt）
- 支持不同工具的差异化修剪策略

## Summary

本设计方案实现了基于 Opencode 架构的两层压缩策略（Compaction + Pruning），显著提升了 Token 管理效率：

### 关键成果

1. **Compaction 优化**
   - 简化溢出判断逻辑：使用 `triggerRatio` 替代复杂的 `usableInput` 计算
   - 更直观的触发条件：`0.7` 表示使用超过 70% 时触发
   - 基于最后一次 assistant 响应的实际 usage 计算

2. **Pruning 实现**
   - 智能保护最近 2 轮对话和 40k Token 内容
   - 保护关键工具输出（skill, task）
   - 仅在修剪量 > 20k 时执行，避免频繁操作

3. **架构优化**
   - 统一配置管理：`compression.ts` 模块
   - 清晰的职责分离：Compaction、Pruning、Truncation(已独立)
   - 完整的测试覆盖

### 协同工作

- **PR #718 - Truncation Plugin**：在工具执行层限制单次输出大小
- **本 PR - Compaction & Pruning**：在历史管理层优化整体 context 使用

两个 PR 共同构成了完整的三层压缩策略，实现了 **"掐头去尾，限宽保质"** 的设计理念。
