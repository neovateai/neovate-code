# Tools 禁用配置功能

**Date:** 2025-12-04

## Context

参考 https://opencode.ai/docs/tools/ 的实现方式，为 Neovate 添加工具禁用功能。用户需要能够通过配置文件或命令行参数灵活地禁用特定的工具（内置工具或 MCP 工具）。

**初始需求：**
- 实现 `toolName: false` 的配置方式来禁用工具
- 支持通过命令行参数传入配置
- 与现有配置系统保持一致

## Discussion

### 使用场景优先级
经讨论确认，**全局禁用和单次禁用同样重要**：
- 配置文件支持：用于持久化的工具访问控制策略
- 命令行参数支持：用于临时性的工具限制需求

### 禁用粒度
**决定支持：内置工具 + MCP 工具的精确禁用**
- 支持禁用内置工具（如 `write: false`, `bash: false`）
- 支持禁用特定 MCP 工具（如 `mcp__filesystem/read_file: false`）
- **不支持通配符模式**（如 `mcp-*/*: false`），保留未来扩展空间

### 配置优先级
遵循现有配置系统的优先级：
```
命令行参数 (--tools) > 项目配置 (.neovate/config.json) > 全局配置 (~/.neovate/config.json) > 默认行为
```

### 实现位置
**关键决策：在 `resolveTools` 函数中集中过滤**

优势：
- 单一职责：`resolveTools` 负责决定返回哪些工具
- 集中管理：所有工具（内置 + MCP）在一处统一过滤
- 调用链清晰：`Project.send()` → `resolveTools()` → 过滤后的工具列表
- 零运行时开销：被禁用的工具不会进入 `Tools` 类

### 参数设计
**使用 `--tools` 而非通用的 `--config`**
- 更加语义化和直观
- 专门用于工具配置，避免与其他配置混淆
- 接受 JSON 字符串格式：`--tools '{"write":false}'`

## Approach

### 核心设计原则
1. **简单优先**：只实现精确匹配，不引入复杂的模式匹配
2. **向后兼容**：未配置时保持现有行为，所有工具默认启用
3. **渐进增强**：为未来扩展（如通配符）预留空间
4. **一致性**：与现有配置系统的设计模式保持一致

### 解决方案概述
通过在配置系统中添加 `tools` 字段，允许用户通过键值对（`toolName: boolean`）控制工具的启用状态。在工具解析阶段（`resolveTools`）根据配置过滤掉被禁用的工具，使其完全不可用。

## Architecture

### 1. 配置结构扩展

**Config 类型定义** (`src/config.ts`)：
```typescript
export type Config = {
  // ... 现有字段
  tools?: Record<string, boolean>;  // 新增：工具禁用配置
};
```

**配置键注册**：
```typescript
const VALID_CONFIG_KEYS = [
  ...现有 keys,
  'tools',  // 新增
];

const OBJECT_CONFIG_KEYS = [
  ...现有 keys,
  'tools',  // 新增
];
```

**配置示例**：

全局配置 (`~/.neovate/config.json`):
```json
{
  "tools": {
    "write": false,
    "bash": false
  }
}
```

项目配置 (`.neovate/config.json`):
```json
{
  "tools": {
    "write": true,  // 覆盖全局配置
    "mcp__filesystem/read_file": false
  }
}
```

### 2. 命令行参数解析

**Argv 类型扩展** (`src/index.ts`):
```typescript
type Argv = {
  _: string[];
  // ... 现有字段
  tools?: string;  // 新增：接受 JSON 字符串
};
```

**参数解析器配置**：
```typescript
async function parseArgs(argv: any) {
  const { default: yargsParser } = await import('yargs-parser');
  const args = yargsParser(argv, {
    // ... 现有配置
    string: [
      // ... 现有字段
      'tools',  // 新增
    ],
  }) as Argv;
  return args;
}
```

**解析和验证逻辑**：
```typescript
export async function runNeovate(opts: {...}) {
  const argv = await parseArgs(process.argv.slice(2));
  
  // 解析 --tools 参数
  let toolsConfig: Record<string, boolean> | undefined;
  if (argv.tools) {
    try {
      toolsConfig = JSON.parse(argv.tools);
      
      // 验证格式
      if (typeof toolsConfig !== 'object' || Array.isArray(toolsConfig)) {
        throw new Error('must be a JSON object like {"write":false}');
      }
      
      // 验证值类型
      for (const [name, value] of Object.entries(toolsConfig)) {
        if (typeof value !== 'boolean') {
          throw new Error(`tool "${name}" must be true or false, got: ${value}`);
        }
      }
    } catch (error) {
      console.error(`Error: Invalid --tools parameter`);
      console.error(`  ${error.message}`);
      console.error(`  Example: --tools '{"write":false,"bash":false}'`);
      process.exit(1);
    }
  }
  
  const contextCreateOpts = {
    // ... 
    argvConfig: {
      model: argv.model,
      planModel: argv.planModel,
      // ... 其他现有字段
      tools: toolsConfig,  // 新增
    },
  };
  // ...
}
```

### 3. 工具过滤逻辑

**在 `resolveTools` 中实现过滤** (`src/tool.ts`):
```typescript
export async function resolveTools(opts: ResolveToolsOpts) {
  const { cwd, productName, paths } = opts.context;
  const sessionId = opts.sessionId;
  
  // ... 现有的工具创建逻辑
  
  const mcpTools = await getMcpTools(opts.context);
  
  const allTools = [
    ...readonlyTools,
    ...writeTools,
    ...todoTools,
    ...backgroundTools,
    ...mcpTools,
  ];
  
  // 新增：根据配置过滤工具
  const toolsConfig = opts.context.config.tools;
  if (!toolsConfig) {
    return allTools;  // 未配置时返回所有工具
  }
  
  return allTools.filter(tool => {
    // 检查工具是否被显式禁用
    const isDisabled = toolsConfig[tool.name] === false;
    return !isDisabled;
  });
}
```

**过滤逻辑说明**：
- 如果 `config.tools` 未定义，返回所有工具（向后兼容）
- 只有显式设置为 `false` 的工具会被过滤掉
- 默认所有工具都是启用的
- 配置中不存在的工具名会被忽略（不报错）

### 4. 错误处理和边界情况

**配置验证** (`ConfigManager.setConfig`):
```typescript
setConfig(global: boolean, key: string, value: string) {
  // ... 现有逻辑
  
  if (key === 'tools') {
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new Error(`Invalid tools configuration: must be valid JSON`);
    }
    
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`Invalid tools configuration: must be an object`);
    }
    
    // 验证所有值都是 boolean
    for (const [toolName, enabled] of Object.entries(parsed)) {
      if (typeof enabled !== 'boolean') {
        throw new Error(
          `Invalid tools configuration: "${toolName}" must be true or false`
        );
      }
    }
    
    newValue = parsed;
  }
  
  // ... 现有逻辑
}
```

**边界情况处理**：

| 情况 | 行为 |
|------|------|
| 工具名不存在 | 静默忽略，不报错 |
| 空配置 `{}` | 有效，等同于不配置 |
| 配置冲突 | 按优先级：命令行 > 项目 > 全局 |
| 无效 JSON | 报错并提示正确格式 |
| 非 boolean 值 | 报错并指明具体的工具名 |

**Help 文档更新**：
```
--tools <json>                Tools configuration (JSON object with tool names as keys and boolean values)

Examples:
  neovate --tools '{"write":false}' "analyze this code"
  neovate --tools '{"bash":false,"write":false}' "explain the logic"
```

### 5. 使用示例

**场景 1：通过命令行临时禁用工具**
```bash
# 只读模式：禁用所有写入相关工具
neovate --tools '{"write":false,"bash":false,"edit":false}' "分析这个项目的架构"

# 禁用特定 MCP 工具
neovate --tools '{"mcp__filesystem/write_file":false}' "帮我重构代码"
```

**场景 2：项目级别的工具限制**
```json
// .neovate/config.json
{
  "tools": {
    "bash": false,  // 该项目禁止执行 bash 命令
    "write": false  // 该项目只读
  }
}
```

**场景 3：配置优先级示例**
```
全局配置: { "write": false }
项目配置: { "write": true }   ← 覆盖全局
命令行:   --tools '{"write":false}'  ← 最终生效
```

### 6. 测试场景

建议的测试覆盖：
- ✅ 命令行禁用单个内置工具
- ✅ 命令行禁用多个工具
- ✅ 配置文件禁用工具
- ✅ 配置优先级验证
- ✅ MCP 工具禁用
- ✅ 无效 JSON 格式错误处理
- ✅ 非 boolean 值错误处理
- ✅ 空配置不影响默认行为
- ✅ 不存在的工具名静默忽略

### 7. 未来扩展预留

当前设计为未来扩展预留了空间：

**可能的扩展方向**：
1. **通配符支持**：`"mcp__*/*": false` 禁用所有 MCP 工具
2. **工具分组**：`"@write": false` 禁用所有写入类工具
3. **条件禁用**：根据文件路径、时间等条件动态禁用
4. **权限级别**：`"write": "approval"` 需要批准才能使用

**实现方式**：
在 `resolveTools` 的过滤逻辑中扩展匹配规则即可，不需要改动配置结构和参数解析部分。

## Implementation Notes

### 关键改动文件
1. `src/config.ts` - Config 类型和验证逻辑
2. `src/index.ts` - 命令行参数解析
3. `src/tool.ts` - 工具过滤逻辑

### 实现顺序建议
1. 先实现配置结构扩展（Config 类型、验证）
2. 再实现命令行参数解析（--tools）
3. 最后实现工具过滤逻辑（resolveTools）
4. 添加测试用例

### 注意事项
- 保持向后兼容，未配置时的默认行为不变
- 错误提示要清晰，给出具体的示例
- 配置验证要严格，避免运行时错误
- 过滤逻辑要高效，避免性能损耗
