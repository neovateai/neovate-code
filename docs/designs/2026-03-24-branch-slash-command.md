# /branch 命令 - Session Fork

**Date:** 2026-03-24

## Context

在 `src/slash-commands/builtin` 目录下实现 `/branch` 命令。

**需求：**

- `/branch` — 直接 fork 当前 session，自动生成标题 `"原标题 (branch)"`
- `/branch [name]` — fork 的同时使用 `name` 作为新 session 的 custom title
- fork 完成后自动切换（resume）到新 session

## Discussion

**Q: fork 后用户如何继续使用新 session？**
选择：自动切换到新 session（类似 `git checkout -b`），原 session 保留可通过 `/resume` 回去。

**Q: 未传 name 时如何命名？**
选择：简化为固定格式 `"原标题 (branch)"`，不做计数去重（不需要 Fork 2 / Fork 3）。

**Q: 文件复制方案用哪种？**
初始方案考虑 `copyFileSync`（O(1) 内核复制），但由于需要替换每条消息的 `sessionId` 字段并追加 `forkedFrom` 元数据，必须逐行解析修改。

最终方案：**一次性读取 → 内存处理 → 一次性写入**，性能接近最优：

- 一次 `readFileSync` 读取全文
- 内存中 `split('\n')` + `JSON.parse` + 修改字段
- 一次 `writeFileSync` 写入新文件

**Q: 是否需要 loading 交互？**
不需要。本地 JSONL 文件通常几十 KB 到几 MB，整个流程 < 50ms，无感知延迟。

## Approach

1. 新增 `sessions.fork` NodeBridge handler（后端逻辑）
2. 新增 `branch.tsx` slash command（前端命令，使用 `LocalJSXCommand`）
3. 在 `index.ts` 注册新命令

## Architecture

### 涉及文件

| 文件                                    | 操作                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `src/nodeBridge.types.ts`               | 新增 `SessionsForkInput` / `SessionsForkOutput` 类型及 HandlerMap 条目 |
| `src/nodeBridge/slices/session.ts`      | 新增 `sessions.fork` handler 实现                                      |
| `src/slash-commands/builtin/branch.tsx` | 新建，`LocalJSXCommand`                                                |
| `src/slash-commands/builtin/index.ts`   | 注册 `createBranchCommand()`                                           |

### `sessions.fork` handler 逻辑

```
input:  { cwd, sessionId, customTitle?: string }
output: { sessionId: string, logFile: string, title: string }

1. context = await getContext(cwd)
2. srcLogPath = context.paths.getSessionLogPath(sessionId)
3. 检查文件存在，不存在返回 error
4. newSessionId = randomUUID().slice(0, 8)   // 同 Session.createSessionId() 格式
5. destLogPath = context.paths.getSessionLogPath(newSessionId)
6. content = fs.readFileSync(srcLogPath, 'utf-8')   // 一次性读取
7. lines = content.split('\n').filter(Boolean)
8. newLines = lines.map(line => {
     parsed = JSON.parse(line)
     if (parsed.type === 'message') {
       return JSON.stringify({
         ...parsed,
         sessionId: newSessionId,
         forkedFrom: { sessionId: originalSessionId, messageUuid: parsed.uuid }
       })
     }
     return line   // config / snapshot / summary 等原样保留
   })
9. fs.writeFileSync(destLogPath, newLines.join('\n') + '\n', { mode: 0o600 })
10. title 确定：
    - 有传 customTitle → 直接用
    - 没传 → 调用 getSessionTitle() 取原 session 标题 → `${title} (branch)`
11. appendFileSync(destLogPath,
      JSON.stringify({ type: 'custom-title', customTitle: title, sessionId: newSessionId }) + '\n'
    )
    // 注意：getSessionTitle() 从后往前扫描取最新 custom-title，
    // 新追加的记录会自动覆盖原文件中复制过来的旧 custom-title，无需额外清理
12. return { success: true, data: { sessionId: newSessionId, logFile: destLogPath, title } }
```

### `forkedFrom` 字段说明

参照分析文档，每条 `type: 'message'` 行追加：

```json
{
  "forkedFrom": {
    "sessionId": "原sessionId",
    "messageUuid": "该条消息原有的uuid"
  }
}
```

用于追溯分支来源，与 Claude Code 的 `zrY()` 实现保持一致。

### `branch.tsx` 命令逻辑

```tsx
export function createBranchCommand(): LocalJSXCommand {
  return {
    type: "local-jsx",
    name: "branch",
    description: "Fork the current session into a new branch",
    async call(onDone, _context, args) {
      return React.createElement(() => {
        const { bridge, cwd, sessionId, resumeSession } = useAppStore();
        React.useEffect(() => {
          if (!sessionId) {
            onDone("No active session");
            return;
          }
          bridge
            .request("sessions.fork", {
              cwd,
              sessionId,
              customTitle: args?.trim() || undefined,
            })
            .then(async (result) => {
              if (result.success) {
                const { sessionId: newId, logFile, title } = result.data;
                await resumeSession(newId, logFile);
                setTerminalTitle(title);
                onDone(`Branched to: ${title}`);
              } else {
                onDone(`Failed to branch: ${result.error}`);
              }
            })
            .catch(() => onDone("Failed to branch session"));
        }, []);
        return null;
      });
    },
  };
}
```

### 类型定义

```ts
// nodeBridge.types.ts
export interface SessionsForkInput {
  cwd: string;
  sessionId: string;
  customTitle?: string;
}

export interface SessionsForkOutput {
  sessionId: string;
  logFile: string;
  title: string;
}

// HandlerMap 新增：
'sessions.fork': { input: SessionsForkInput; output: SessionsForkOutput }
```
