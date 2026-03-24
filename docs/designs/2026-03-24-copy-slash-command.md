# /copy 指令实现

**Date:** 2026-03-24

## Context

在 `src/slash-commands/builtin` 下实现 `/copy` 指令，功能是将最后一条 AI 回复复制到系统剪贴板。

## Discussion

**命令类型选择**

最初考虑 `LocalCommand`，但 `LocalCommand` 通过 `nodeBridge` 的 `slashCommand.execute` 执行，传入的是服务端 `Context`，不含 `messages` 字段。而 `/copy` 需要读取对话消息，因此选择 `LocalJSXCommand`，可在 UI 层通过 `useAppStore` 直接获取 `messages`。

**剪贴板实现方式**

探讨了三种方案：

1. native 系统命令（pbcopy / xclip / clip）
2. OSC52 ANSI 转义序列（支持 SSH 场景）
3. 自动探测（native + OSC52 备选）

最终选择 **native 系统命令**，并直接在 `copy.tsx` 内实现，不新增 `clipboard.write` bridge handler（因为剪贴板写入逻辑与 `/copy` 强绑定，不具备通用性）。

项目中 `src/ui/TextInput/utils/imagePaste.ts` 已有完整的跨平台剪贴板命令映射，可复用其平台判断模式。

**消息提取**

`AssistantContent` 类型为 `string | Array<TextPart | ReasoningPart | ToolUsePart>`，需处理两种情况：

- 纯字符串直接使用
- 数组时过滤 `type === 'text'` 的 block，多段用 `\n\n` 拼接，跳过 `tool_use`、`reasoning` 等非文本内容

## Approach

`LocalJSXCommand` 实现 `copy.tsx`，在 UI 层通过 `useAppStore().messages` 获取消息，提取最后一条 assistant 消息的纯文本，直接调用系统命令写入剪贴板，通过 `onDone` 返回结果字符串展示给用户。

只需改动两个文件，无需新增 bridge handler 或修改 nodeBridge 类型。

## Architecture

### 文件变更

| 文件                                  | 操作               |
| ------------------------------------- | ------------------ |
| `src/slash-commands/builtin/copy.tsx` | 新建               |
| `src/slash-commands/builtin/index.ts` | 注册 `copyCommand` |

### 数据流

```
用户输入 /copy
    │
    └─ copy.tsx (LocalJSXCommand)
         │
         ├─ useAppStore().messages
         │    └─ filter(role === 'assistant') → at(-1)
         │
         ├─ 提取纯文本
         │    ├─ content 为 string → 直接使用
         │    └─ content 为数组 → filter(type==='text').map(t.text).join('\n\n')
         │
         └─ child_process 写入剪贴板
              ├─ darwin  → pbcopy
              ├─ linux   → xclip -selection clipboard / wl-copy
              └─ win32   → clip
```

### 返回值

| 情形              | 返回文本                                 |
| ----------------- | ---------------------------------------- |
| 复制成功          | `Copied to clipboard (N chars, M lines)` |
| 无 assistant 消息 | `No assistant message to copy`           |
| 无文本内容        | `No text content to copy`                |
| 写入失败          | 平台相关错误提示（含安装建议）           |

### 注意事项

- `supportsNonInteractive` 字段在本项目命令类型定义中不存在，无需处理
- `isHidden` 字段同样不在本项目类型定义中，无需设置
- 跨平台命令参考 `imagePaste.ts` 中已有的映射模式，保持风格一致
