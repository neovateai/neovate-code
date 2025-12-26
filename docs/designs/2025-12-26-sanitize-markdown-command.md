# AI 命令生成器的 Markdown 格式清理

**Date:** 2025-12-26

## Context

在 `src/commands/run.tsx` 的实现中，AI 可能返回包含 Markdown 格式的命令响应（如 ````bash\nls -la\n````, `` `npm install` `` 等），这些格式符号会被直接传递给 shell 执行，导致命令执行失败。

**问题场景：**
- AI 返回 ````bash\nls -la\n```` 而不是纯命令 `ls -la`
- 用户期望系统能自动识别并清理这些 Markdown 格式，无需手动干预
- 需要处理多种格式：````bash...````, ````...````, `` `...` ``

## Discussion

### 问题确认阶段

通过提问明确了以下关键信息：

1. **问题类型**：AI 返回的命令包含 Markdown 代码块格式
2. **具体格式**：包括 ````bash...````, ````...````, `` `...` `` 三种格式
3. **期望行为**：自动清理所有 Markdown 格式，静默处理，无需用户感知

### 方案探索

评估了三种技术方案：

**方案 1: 正则表达式清理** ✅ 最终选择
- 优势：实现简单、性能好、零依赖、覆盖 95% 场景
- 劣势：复杂嵌套格式可能处理不完美
- 复杂度：⭐️ (非常简单)

**方案 2: Markdown 解析器**
- 优势：解析准确、能处理复杂嵌套
- 劣势：增加 npm 依赖和包体积
- 复杂度：⭐️⭐️ (中等)

**方案 3: Prompt 工程增强 + 轻量清理**
- 优势：从根源减少问题、保持代码简洁
- 劣势：依赖 AI 遵守指令
- 复杂度：⭐️⭐️ (中等)

**决策依据**：选择方案 1 是因为其简单、快速、零依赖，适合快速修复问题。

## Approach

采用**正则表达式清理方案**，核心思路：

1. 创建独立的纯函数 `sanitizeCommand(rawCommand: string): string`
2. 在 AI 返回响应后立即调用该函数清理格式
3. 处理完成后再进入显示或执行阶段

**处理流程：**
```
AI Response → sanitizeCommand() → 验证非空 → setState (displaying/executing)
```

**清理步骤：**
1. 移除代码块格式（````bash\n...\n```` 和 ````\n...\n````）
2. 移除内联代码格式（`` `...` ``，但保护命令中的合法反引号）
3. 清理前后空白字符
4. 移除多余换行

## Architecture

### 核心函数实现

```typescript
function sanitizeCommand(rawCommand: string): string {
  let cleaned = rawCommand;
  
  // Step 1: 移除代码块格式 (```bash\n...\n``` 或 ```\n...\n```)
  cleaned = cleaned.replace(/^```(?:bash|sh|shell)?\s*\n?([\s\S]*?)\n?```$/gm, '$1');
  
  // Step 2: 移除内联代码格式 (`...`)
  // 但要小心：shell 反引号是合法的，只在整个字符串被包裹时才移除
  if (cleaned.startsWith('`') && cleaned.endsWith('`') && cleaned.split('`').length === 3) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Step 3: 清理空白字符
  cleaned = cleaned.trim();
  
  // Step 4: 移除多行命令中的首尾空行
  cleaned = cleaned.replace(/^\n+|\n+$/g, '');
  
  return cleaned;
}
```

### 集成位置

**文件**: `src/commands/run.tsx`

**位置**: Helper Functions 区域（在 `executeShell` 函数之后）

**调用点修改**: 在 `generateCommand` 函数中

```typescript
// 修改前
const command = result.success ? result.data?.text?.trim() : null;

// 修改后
const rawCommand = result.success ? result.data?.text : null;
const command = rawCommand ? sanitizeCommand(rawCommand) : null;
```

### 边界情况处理

| 场景 | 输入示例 | 期望输出 | 处理方式 |
|------|---------|---------|---------|
| 标准代码块 | ````bash\nls -la\n```` | `ls -la` | 正则移除 |
| 无语言标识 | ````\nfind .\n```` | `find .` | 正则移除 |
| 内联代码 | `` `npm install` `` | `npm install` | 首尾检测移除 |
| 合法反引号 | `` echo `date` `` | `` echo `date` `` | 保持不变（多个反引号） |
| 纯命令 | `ls -la` | `ls -la` | 仅 trim |
| 多行命令 | ````bash\ncd /tmp\nls\n```` | `cd /tmp\nls` | 保留换行符 |
| 带空白 | `  \n```\nls\n```\n  ` | `ls` | 全面清理 |
| 空字符串 | `""` | `""` | 返回空串，由后续错误处理 |

### 测试验证

**推荐测试命令：**
```bash
# 测试各种格式
your-cli run "list files"
your-cli run "show current date"
your-cli run "find log files"
```

**验证点：**
- AI 返回带格式的命令能正确清理并执行
- 不影响正常纯命令的执行
- 命令中的合法 shell 语法（如反引号替换）不被破坏

### 实现注意事项

1. **函数放置位置**：在文件的 Helper Functions 区域，与 `executeShell` 函数同级
2. **保持纯函数**：`sanitizeCommand` 不依赖外部状态，便于测试
3. **错误处理**：清理后为空的情况由现有错误处理流程兜底
4. **性能考虑**：正则操作在命令字符串（通常较短）上执行，性能影响可忽略

### 后续优化空间

1. 可选：添加单元测试覆盖所有边界情况
2. 可选：记录日志当检测到格式清理发生时（调试用）
3. 可选：统计清理频率，评估是否需要改进 System Prompt
