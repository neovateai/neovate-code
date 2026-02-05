# 会话恢复时的 Tool Use/Tool Result 清理机制

**Date:** 2026-02-04

## Context

在 Neovate Code 中，当会话因崩溃、用户强制终止或其他异常情况中断时，可能会留下未完成的 `tool_use` 调用（即没有对应的 `tool_result`）。这些不完整的工具调用会导致以下问题：

1. **API 错误**：在恢复会话后继续对话时，LLM Provider API 要求每个 `tool_use` 必须有对应的 `tool_result`，否则会返回 400 错误
2. **状态不一致**：会话历史中残留未完成的工具调用，影响上下文理解
3. **用户体验差**：需要手动修复会话文件或重新开始会话

参考 Claude Code 的实现（详见 `tool-use-tool-result-handling.md`），其通过在会话恢复时自动清理未匹配的 `tool_use`，确保恢复的会话始终处于有效状态。我们需要为 Neovate Code 实现类似的机制。

## Discussion

### 核心需求

在设计过程中，通过一系列问题明确了以下核心需求：

**Q1: 触发时机？**
- ✅ **选择**：加载会话时自动清理（推荐）
- 理由：参考 Claude Code，在 `Session.resume()` 或 `loadSessionMessages()` 时自动过滤，用户无感知，适合大多数场景

**Q2: 处理策略？**
- ✅ **选择**：直接删除（推荐）
- 理由：参考 Claude Code 的 `s19()` 函数，直接过滤掉没有 `tool_result` 的 `tool_use` 消息，保证会话状态干净

**Q3: 实现层级？**
- ✅ **选择**：在 `filterMessages()` 中实现
- 理由：自动应用于所有调用 `loadSessionMessages()` 的场景，包括 `Session.resume()` 和 NodeBridge

**Q4: 诊断信息？**
- ✅ **选择**：通过 DEBUG 输出即可
- 理由：使用现有的 `debug` 模块（`neovate:session` 命名空间），在需要时通过环境变量启用

### 方案探索

评估了三种实现方案：

#### 方案 A：渐进式增强（最终选择）
- 在现有 `filterMessages()` 中增加清理逻辑
- 创建辅助函数 `getToolResultIds()` 和 `getToolUseIds()`
- 优点：最小化改动，自动应用于所有调用点
- 缺点：`filterMessages()` 职责略重

#### 方案 B：管道式清理
- 创建独立的 `cleanupToolUseMismatch()` 函数
- 在 `loadSessionMessages()` 中串联调用
- 优点：单一职责，便于测试
- 缺点：需要遍历两次，调用链更长

#### 方案 C：统一过滤器
- 重构为可配置的 `normalizeMessages()`
- 优点：性能最优，灵活性高
- 缺点：改动大，需要迁移现有调用点

**最终选择方案 A**，因为：
- 改动最小，向后兼容性最好
- 符合 "渐进式增强" 的原则
- 自动应用于所有场景，无需修改调用方

### 边界情况处理

| 场景 | 行为 |
|------|------|
| 空消息列表 | 直接返回 `[]` |
| 没有 tool_use | 正常返回 |
| 所有 tool_use 都有 tool_result | 正常返回 |
| assistant 消息包含多个 tool_use | 只要有一个未匹配就过滤整条消息 |
| assistant 消息混合 text 和 tool_use | 如果 tool_use 未匹配，整条消息被过滤 |

对于混合内容的 assistant 消息，采用 **保守策略**：整条消息被过滤（包括 text 部分），保持消息的原子性，避免部分内容残留导致上下文混乱。

## Approach

采用与 Claude Code 相同的核心思路：

1. **收集所有 tool_use IDs** - 遍历 assistant 消息中的 `tool_use` 部分
2. **收集所有 tool_result IDs** - 遍历 tool 消息中的 `tool-result` 部分
3. **计算差集** - 找出没有对应 `tool_result` 的 `tool_use` IDs
4. **过滤消息** - 移除包含未匹配 `tool_use` 的 assistant 消息

### 实现位置

修改 `src/session.ts` 中的 `filterMessages()` 函数：

```typescript
export function filterMessages(
  messages: NormalizedMessage[],
): NormalizedMessage[] {
  // 第一步：现有的 parentUuid 过滤逻辑（保持不变）
  const filteredByPath = /* ... */;
  
  // 第二步：新增的 tool_use/tool_result 清理逻辑
  const toolResultIds = getToolResultIds(filteredByPath);
  const toolUseIds = getToolUseIds(filteredByPath);
  const unmatchedIds = new Set(
    [...toolUseIds].filter(id => !toolResultIds.has(id))
  );
  
  if (unmatchedIds.size > 0) {
    debug(`[filterMessages] Found ${unmatchedIds.size} unmatched tool_use(s)`);
  }
  
  // 过滤掉未匹配的 tool_use 消息
  return filteredByPath.filter(/* ... */);
}
```

### 集成点

由于修改在 `filterMessages()` 中，以下所有调用点都会自动应用清理逻辑：

- ✅ `Session.resume()` - 恢复会话
- ✅ NodeBridge 的 `getSessionDetail` - 获取会话详情
- ✅ 导出会话为 Markdown - 基于 `loadSessionMessages`
- ✅ 其他任何调用 `filterMessages()` 的地方

## Architecture

### 核心函数

#### 1. `getToolResultIds()`

```typescript
function getToolResultIds(messages: NormalizedMessage[]): Set<string> {
  const ids = new Set<string>();
  
  for (const message of messages) {
    if (message.role === 'tool' && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'tool-result') {
          ids.add(part.toolCallId);
        }
      }
    }
  }
  
  return ids;
}
```

**职责**：收集所有有 `tool_result` 的 tool_use IDs

#### 2. `getToolUseIds()`

```typescript
function getToolUseIds(messages: NormalizedMessage[]): Set<string> {
  const ids = new Set<string>();
  
  for (const message of messages) {
    if (message.role === 'assistant' && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'tool_use') {
          ids.add(part.id);
        }
      }
    }
  }
  
  return ids;
}
```

**职责**：收集所有 tool_use IDs

#### 3. 改造后的 `filterMessages()`

```typescript
export function filterMessages(
  messages: NormalizedMessage[],
): NormalizedMessage[] {
  // === 第一步：现有的 parentUuid 过滤逻辑（保持不变）===
  const messageTypeOnly = messages.filter((message) => {
    const isMessage = message.type === 'message';
    return isMessage;
  });

  if (messageTypeOnly.length === 0) {
    return [];
  }

  const messageMap = new Map<string, NormalizedMessage>();
  for (const message of messageTypeOnly) {
    messageMap.set(message.uuid, message);
  }

  const activePath = new Set<string>();
  let currentMessage = messageTypeOnly[messageTypeOnly.length - 1];

  while (currentMessage) {
    activePath.add(currentMessage.uuid);
    if (currentMessage.parentUuid === null) {
      break;
    }
    const parentMessage = messageMap.get(currentMessage.parentUuid);
    if (!parentMessage) {
      break;
    }
    currentMessage = parentMessage;
  }

  const filteredByPath = messageTypeOnly.filter((message) =>
    activePath.has(message.uuid),
  );

  // === 第二步：新增的 tool_use/tool_result 清理逻辑 ===
  const toolResultIds = getToolResultIds(filteredByPath);
  const toolUseIds = getToolUseIds(filteredByPath);
  
  const unmatchedIds = new Set(
    [...toolUseIds].filter(id => !toolResultIds.has(id))
  );

  if (unmatchedIds.size > 0) {
    debug(
      `[filterMessages] Found ${unmatchedIds.size} unmatched tool_use(s): ${[...unmatchedIds].join(', ')}`
    );
  }

  return filteredByPath.filter((message) => {
    if (message.role === 'assistant' && Array.isArray(message.content)) {
      const hasUnmatchedToolUse = message.content.some(
        (part) => part.type === 'tool_use' && unmatchedIds.has(part.id),
      );
      
      if (hasUnmatchedToolUse) {
        debug(
          `[filterMessages] Filtering out assistant message ${message.uuid} with unmatched tool_use`
        );
        return false;
      }
    }
    return true;
  });
}
```

### 数据流示例

假设会话在工具执行时崩溃：

```
输入消息（从 JSONL 加载）：
[
  { uuid: '1', role: 'user', content: 'read file.ts' },
  { uuid: '2', role: 'assistant', content: [
      { type: 'tool_use', id: 'toolu_001', name: 'read' }
    ]
  },
  { uuid: '3', role: 'tool', content: [
      { type: 'tool-result', toolCallId: 'toolu_001', ... }
    ]
  },
  { uuid: '4', role: 'assistant', content: [
      { type: 'tool_use', id: 'toolu_002', name: 'write' }
    ]
  },
  // ❌ 崩溃：没有 toolu_002 的 tool_result
]

处理流程：
1. parentUuid 过滤 → 保留所有 4 条
2. getToolResultIds() → { 'toolu_001' }
3. getToolUseIds() → { 'toolu_001', 'toolu_002' }
4. 计算差集 → { 'toolu_002' }
5. Debug 输出：Found 1 unmatched tool_use(s): toolu_002
6. 过滤消息 → 移除 uuid: '4'

输出消息（干净的会话）：
[
  { uuid: '1', role: 'user', content: 'read file.ts' },
  { uuid: '2', role: 'assistant', content: [
      { type: 'tool_use', id: 'toolu_001', name: 'read' }
    ]
  },
  { uuid: '3', role: 'tool', content: [
      { type: 'tool-result', toolCallId: 'toolu_001', ... }
    ]
  },
]
```

### Debug 输出

启用调试模式查看清理过程：

```bash
DEBUG=neovate:session neovate --resume <session-id>

# 预期输出：
# neovate:session [filterMessages] Found 2 unmatched tool_use(s): toolu_002, toolu_003
# neovate:session [filterMessages] Filtering out assistant message abc-123 with unmatched tool_use
```

### 测试策略

在 `src/session.test.ts` 中添加测试用例：

1. **基本场景**：移除未匹配的 tool_use
2. **保留场景**：保留有匹配的 tool_use
3. **部分匹配**：处理多个 tool_use 的部分匹配
4. **无 tool_use**：不影响纯文本消息
5. **集成测试**：验证 `Session.resume()` 自动清理

### 性能分析

- **时间复杂度**：O(n)，其中 n 是消息数量
  - parentUuid 过滤：O(n)
  - 收集 tool_use IDs：O(n)
  - 收集 tool_result IDs：O(n)
  - 过滤消息：O(n)
  - 总计：O(4n) = O(n)

- **空间复杂度**：O(m)，其中 m 是 tool_use 数量
  - 通常 m << n，空间开销很小

### 与现有功能的兼容性

| 现有功能 | 影响 |
|---------|------|
| `findIncompleteToolUses()` | ✅ 无影响（该函数在会话进行中使用） |
| NodeBridge `getSessionDetail` | ✅ 自动应用清理 |
| Session 导出为 Markdown | ✅ 自动应用清理 |
| History 压缩 | ✅ 无影响（压缩在内存中的消息） |

## Implementation Checklist

- [ ] 在 `src/session.ts` 中实现 `getToolResultIds()` 函数
- [ ] 在 `src/session.ts` 中实现 `getToolUseIds()` 函数
- [ ] 修改 `filterMessages()` 函数，添加清理逻辑
- [ ] 添加 debug 输出（使用 `neovate:session` 命名空间）
- [ ] 在 `src/session.test.ts` 中添加单元测试
- [ ] 手动测试会话恢复场景
- [ ] 验证 DEBUG 输出正确
- [ ] 确保所有现有测试通过
