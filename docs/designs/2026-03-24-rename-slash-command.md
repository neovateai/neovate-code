# /rename Slash Command

**Date:** 2026-03-24

## Context

在 `src/slash-commands/builtin/` 下实现 `/rename` 指令，允许用户在当前会话中直接重命名对话标题。参考 `rename-command-analysis.md`（对原版 CLI 的逆向分析），逻辑复用已有的 `sessions.rename` nodeBridge handler（位于 `src/nodeBridge/slices/session.ts`）。

## Discussion

**方案选型**

探讨了两种 slash command 类型：

- `LocalCommand`：`call(args, context)` 中的 `context` 是后端 `Context` 对象，不包含 `bridge`，无法调用 `sessions.rename`，**不可行**。
- `LocalJSXCommand`：通过 `useAppStore()` 获取 `bridge`、`cwd`、`sessionId`，与 `clear.tsx` 模式一致，**可行**。

**空参数行为**

用户选择：空参数时返回用法提示 `Usage: /rename <name>`，立即退出，不弹出交互输入框。

**遗漏细节排查**

1. **终端标题同步**：原版在重命名成功后调用 `setTerminalTitle(title)` 更新终端 Tab 标题，代码库已有 `src/utils/setTerminalTitle.ts`，需在成功回调中调用。
2. **`context` 参数为空对象**：`store.ts` 调用 `command.call(onDone, {} as any, parsed.args)`，`LocalJSXCommand` 内不能依赖 `context`，只能用 `useAppStore()`，设计正确。
3. **`args` 传递已就绪**：框架在 `store.ts:686` 将 `parsed.args` 传入 `call`，直接使用 `args?.trim()` 即可，无需额外解析。

## Approach

新增 `src/slash-commands/builtin/rename.tsx`，采用 `LocalJSXCommand` 模式：

- 通过 `useAppStore()` 获取 `bridge`、`cwd`、`sessionId`
- 在 `useEffect` 中执行逻辑：校验参数 → 调用 `bridge.request('sessions.rename', ...)` → 同步终端标题 → 调用 `onDone`
- 在 `src/slash-commands/builtin/index.ts` 中注册命令

## Architecture

### 数据流

```
用户输入: /rename 新名称
  │
  └─ store.ts: command.call(onDone, {} as any, "新名称")
       └─ React.createElement(() => { useEffect ... })
            ├─ args?.trim() === '' → onDone('Usage: /rename <name>')
            ├─ !sessionId         → onDone('No active session')
            └─ bridge.request('sessions.rename', { cwd, sessionId, title })
                 └─ nodeBridge/slices/session.ts handler
                      └─ appendFileSync(logPath, '{"type":"custom-title","customTitle":"新名称",...}\n')
                 成功 → setTerminalTitle(title)
                        onDone('Session renamed to: 新名称')
                 失败 → onDone('Failed to rename: <error>')
```

### 变更文件

| 文件 | 变更说明 |
|------|----------|
| `src/slash-commands/builtin/rename.tsx` | 新增，~35 行，`LocalJSXCommand` |
| `src/slash-commands/builtin/index.ts` | 新增 import + 注册，2 行 |

### 关键实现细节

- `sessions.rename` handler 向 `.jsonl` 日志文件追加 `{"type":"custom-title","customTitle":"...","sessionId":"..."}` 事件，持久化标题
- `setTerminalTitle` 通过 ANSI escape code `\x1b]0;...\x07`（OSC 0）更新终端 Tab 标题，Windows 下使用 `process.title`
- 不需要 Swarm 模式处理（当前代码库无此概念）
- 命令注册时无需 `argumentHint`（类型定义中 `BaseSlashCommand` 不含此字段）
