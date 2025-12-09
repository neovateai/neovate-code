# AskUserQuestion Tool 跨端支持

**Date:** 2025-12-04

## Context
当前 `AskUserQuestion` 工具在 UI 层 (`ApprovalModal.tsx`) 的实现方式是直接修改 `approvalModal.toolUse.params.answers` 参数。这种方式在 Client/Server 分离的架构（跨端场景）下无法工作，因为 Client 端的对象修改无法自动同步回 Server 端执行环境。我们需要一种机制将用户在 UI 上提供的答案传回 Server 端的 `NodeBridge`，进而传给 `Loop` 执行。

## Discussion
在讨论中，主要探讨了以下几个关键点：

1.  **协议设计的通用性**：
    *   **通用方案 (Generic)**：允许 `toolApproval` 返回更新后的参数 (`updatedParams`)。这不仅解决了 `AskUserQuestion` 的问题，也为未来其他工具（如用户在执行前修改写入内容）提供了灵活性。
    *   **专用方案 (Specific)**：仅传递 `answers` 字段。
    *   **结论**：选择了 **通用方案**，以支持更广泛的用例。

2.  **返回类型设计**：
    *   **混合返回类型 (Overloaded Return)**：`boolean | { approved: boolean; params?: any }`。
    *   **标准化对象类型**：`{ approved: boolean; params?: any }`。
    *   **结论**：选择了 **混合返回类型**，以保持向后兼容性，最小化对现有代码（特别是简单的 `boolean` 返回情况）的影响。

3.  **最小改动原则**：
    *   用户强调，如果返回值不是对象（即没有参数更新），应保持现状（直接返回 `boolean`），避免不必要的协议开销或破坏现有逻辑。

## Approach
采用通用且向后兼容的方案：
1.  **UI 层**：`ApprovalModal` 获取用户答案后，通过 `resolve` 方法将完整的新参数对象传递给 Store。
2.  **通信层**：`UIBridge` 和 `NodeBridge` 之间的 `toolApproval` 协议升级，支持返回包含 `params` 的对象。
3.  **执行层**：`Loop` 检测 `onToolApprove` 的返回值。如果返回了带有 `params` 的对象，则使用新参数覆盖原有 `toolUse.params`，然后执行工具。

## Architecture

### 1. Loop 层 (`src/loop.ts`)
*   **类型定义**：定义 `ToolApprovalResult = boolean | { approved: boolean; params?: any }`。
*   **逻辑更新**：在执行工具前，检查 `onToolApprove` 的返回值。如果返回对象且包含 `params`，则更新 `toolUse.params`。

### 2. NodeBridge & Protocol (`src/nodeBridge.ts`)
*   **处理逻辑**：在 `session.send` 的 `onToolApprove` 回调中，调用 `messageBus.request('toolApproval')`。
*   **返回值处理**：接收 UI 返回的结果。如果有 `params`，则返回对象结构 `{ approved: true, params: ... }`；否则，为了最小化改动，直接返回 `boolean`（如果逻辑允许）或仅在需要时返回对象。

### 3. UI 层 (`src/ui/store.ts` & `src/ui/ApprovalModal.tsx`)
*   **Store Action**：更新 `approveToolUse`，允许 `resolve` 接收可选的 `params` 参数。
*   **Modal 组件**：`ApprovalModal` 在处理 `AskUserQuestion` 时，不再直接修改 `toolUse` 对象，而是构造一个新的参数对象（包含 `answers`），并将其传递给 `resolve` 函数。

### 4. UIBridge (`src/uiBridge.ts`)
*   **Handler**：`toolApproval` handler 将 Store 返回的结果（包含 `approved` 和可选的 `params`）转发给 Server 端。

通过这种架构，数据流变成：
UI (User Answer) -> ApprovalModal -> Store -> UIBridge -> MessageBus -> NodeBridge -> Loop -> Tool Execution (with Answers)。
