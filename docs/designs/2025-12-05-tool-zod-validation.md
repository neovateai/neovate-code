# Tool Zod 参数校验与自动修复

**Date:** 2025-12-05

## Context

目前 `src/tool.ts` 文件中缺少对工具 Zod 参数的校验机制。代码中存在一段被注释掉的校验逻辑，但未启用。为了提高系统的健壮性和模型调用工具的成功率，需要实现一套完整的参数校验机制，当遇到参数错误时能够提醒模型错误信息并帮助其自动修复。

## Discussion

### 关键决策点

**1. 错误处理和模型修复工作流程**
- 探索了三种方案：
  - A. 返回错误信息给模型，让模型自动重试
  - B. 记录错误并中断执行，需要人工介入
  - C. 提供修复建议，生成参数修复建议帮助模型更快修正
- **最终选择：方案 C** - 不仅返回错误，还基于 Zod schema 生成参数修复建议

**2. MCP 工具的处理策略**
- 识别到代码中 MCP 工具的 parameters 不是 Zod 对象
- 探索了三种方案：
  - A. 仅校验非 MCP 工具，MCP 工具跳过 Zod 校验
  - B. 统一校验，将 JSON Schema 转换为 Zod
  - C. 基础 JSON 校验，使用 JSON Schema 验证
- **最终选择：方案 A** - 保持简单，仅对内部工具进行 Zod 校验

**3. 修复建议的详细程度**
- 探索了三种详细级别：
  - A. 简洁版 - 关键错误路径和期望类型
  - B. 详细版 - 包含完整示例 JSON 结构
  - C. 智能版 - 自适应详细程度
- **最终选择：方案 A** - 简洁明了的错误提示

**4. 额外的安全检查**
- 补充了 `isZodObject` 检查逻辑
- 确保只对有效的 Zod schema 进行校验
- 非 Zod 对象的参数自动跳过校验

### 实现方案对比

评估了三种架构方案：

1. **方案 1：集中式校验（已选择）**
   - 在 `Tools.invoke()` 方法中统一处理
   - 代码改动最小，维护成本低
   - 复杂度：⭐⭐

2. **方案 2：装饰器模式**
   - 在 `createTool` 中包装校验逻辑
   - 关注点分离但需要修改多处
   - 复杂度：⭐⭐⭐

3. **方案 3：混合方案**
   - 预校验 + 工具内校验
   - 灵活性高但逻辑分散
   - 复杂度：⭐⭐⭐⭐

## Approach

采用**集中式校验方案**，在 `Tools.invoke()` 方法中添加参数校验逻辑。核心思路：

1. 在解析 JSON 参数后、调用 `tool.execute()` 前插入校验环节
2. 通过双重检查确保只对符合条件的工具进行校验：
   - 非 MCP 工具（通过 `toolName.startsWith('mcp__')` 判断）
   - 参数是有效的 Zod 对象（通过 `isZodObject()` 判断）
3. 校验失败时生成简洁的修复建议返回给模型
4. 通过 `isError: true` 标记错误，模型读取后自动重试

## Architecture

### 新增组件

**1. `isZodObject(schema: any): boolean`**
```typescript
function isZodObject(schema: any): schema is z.ZodTypeAny {
  return schema && typeof schema.safeParse === 'function';
}
```
- 检查对象是否为有效的 Zod schema
- 判断依据：是否存在 `safeParse` 方法

**2. `validateToolParams(schema: z.ZodTypeAny, params: any)`**
```typescript
function validateToolParams(
  schema: z.ZodTypeAny, 
  params: any
): { success: true } | { success: false; error: string }
```
- 使用 `schema.safeParse(params)` 进行安全校验
- 校验成功返回 `{ success: true }`
- 校验失败调用 `generateFixSuggestions()` 生成建议

**3. `generateFixSuggestions(error: z.ZodError): string`**
- 解析 Zod 的 `error.issues` 数组
- 提取每个错误的字段路径、错误类型、期望类型、实际类型
- 生成格式化的错误列表

### 错误信息格式

```
Parameter validation failed:

1. Field 'file_path' is required but missing
2. Field 'limit' expected number, got string
3. Field 'offset' expected number, got null

Please fix the parameters and try again.
```

### 执行流程

```
invoke(toolName, args)
  ↓
检查工具是否存在
  ↓
解析 JSON 参数
  ↓
判断是否为 MCP 工具 (toolName.startsWith('mcp__'))
  ↓
判断是否为 Zod 对象 (isZodObject(tool.parameters))
  ↓ 
【非 MCP + 有效 Zod schema】→ 调用 validateToolParams()
  ↓
【校验失败】→ 返回 ToolResult { llmContent: error, isError: true }
  ↓
【校验成功】→ 执execute(argsObj)
```

### 边界情况处理

1. **嵌套字段错误**：使用 `path.join('.')` 显示完整路径（如 `config.timeout`）
2. **空 path 的错误**：显示为 "Root object"
3. **多个错误**：全部列出，用序号标识
4. **未知错误类型**：降级为显示原始 Zod 错误信息

### 改动范围

- **修改文件**：仅 `src/tool.ts` 一个文件
- **向后兼容**：不影响现有工具的正常运行
- **MCP 工具**：完全不受影响，继续使用原有逻辑
- **非 Zod 参数的工具**：自动跳过校验

### 测试建议

1. 测试正常参数能通过校验
2. 测试缺少必填字段的错误提示
3. 测试类型不匹配的错误提示
4. 测试 MCP 工具不受影响
5. 测试没有 Zod schema 的工具不受影响
6. 测试嵌套对象的字段错误提示
