# Telemetry Send Unification

**Date:** 2026-01-08

## Context
当前埋点（telemetry）触发位于 `src/ui/store.ts` 的 `send()`，只覆盖交互 UI 路径；quiet 模式存在路径差异，其中 `commands/run.tsx` 的 `runQuiet` 走 `utils.quickQuery` 会绕过现有埋点触发。与此同时，仓库内已有 `Plugin.telemetry` hook 与 `utils.telemetry` nodeBridge handler，但缺少“所有发送入口统一触发埋点”的一致机制。目标是重构“埋点发送时机/通道”，让 runQuiet 模式与 `src/sdk.ts` 调用也能一致触发埋点，并且不要求各端分别实现。

## Discussion
关键问题与结论：
- 默认发送场景：选择“所有模式都埋点”（交互/quiet/sdk 一致）。
- SDK telemetry 形式：不希望 SDK/各端各自处理；希望在 nodeBridge 的 send 侧统一兼容。
- 事件粒度：本次仅保留 `send` 事件，不扩展更多事件种类。

备选方案对比：
- 方案A（最终采用）：将 `send` 埋点触发上移到 nodeBridge 的 send 处理链（或其等价的统一发送链路），端侧只要走 send 即自动触发 `Plugin.telemetry`。
- 方案B：保留 `store.send` 埋点，同时 nodeBridge 兜底补发（存在重复/去重复杂度）。
- 方案C：在 `session.send` 或 messageBus 层触发埋点（对绕过 session 的路径不够统一）。

关于 `commands/run.tsx` 的 quickQuery 路径：明确“不考虑这种场景”，即本次不强制将其纳入统一 send 埋点覆盖范围。

非功能性约束：
- 埋点发送不得影响主流程：telemetry 失败需要被吞掉，不阻塞、不抛出到主链路。
- 不做去重：每次 send 触发一次 telemetry 即可。

## Approach
采用方案A：把 `send` 埋点触发点从 UI 层（`src/ui/store.ts`）上移到 nodeBridge 的“统一 send 处理链”中，实现一次接入、各端复用：交互 UI、quiet（index.ts 的 runQuiet）、以及 SDK 的发送行为，只要落到同一 send handler，就会自动触发 `Plugin.telemetry`。

## Architecture
### Components
- 触发点：nodeBridge 的 send handler（或其等价的统一发送入口）。
- 上报扩展点：`Plugin.telemetry({ name: 'send', payload })`（并行执行插件实现）。
- 端侧调整：
  - `src/ui/store.ts`：移除/停用现有在 `send()` 内直接调用 `utils.telemetry(name:'send')` 的逻辑，避免重复与端侧分叉。
  - quiet（index.ts 路径）：通过既有 send 链路自然覆盖。
  - SDK：确保其“发送消息”最终走 nodeBridge 的 send 入口，从而自动触发 telemetry（SDK 不单独实现埋点逻辑）。

### Data Flow
1) 任一端发起“发送消息”（send）。
2) 进入 nodeBridge 的 send handler。
3) 触发 telemetry：调用 `Plugin.telemetry({ name: 'send', payload })`。
4) 继续原有 send 主流程（消息处理/LLM 调用/输出等）。

### Error Handling
- telemetry 必须为 best-effort：内部捕获异常并忽略；不阻塞主链路；不向上抛出。

### Testing
- 用例1：调用 send 时，会触发一次 `Plugin.telemetry(name:'send')`。
- 用例2：quiet 模式（index.ts 路径）触发 send 时同样触发 telemetry。
- 用例3：telemetry hook 抛错时，send 仍能正常完成（不受影响）。
