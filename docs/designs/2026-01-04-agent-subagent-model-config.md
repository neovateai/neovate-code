# Agent Subagent Model 配置支持

**Date:** 2026-01-04

## Context

参考 OpenCode 官方文档中的 Model 配置示例，该示例展示了如何为不同的 agent（如 plan agent）配置不同的模型。当前 Neovate 系统中已有 subagent 机制（如 explore agent），但缺少为每个 subagent 类型单独配置模型的能力。

用户希望能够：
- 为不同的 subagent 类型（如 explore）配置不同的模型
- 支持全局配置和项目级配置
- 在调用 task 工具时可以灵活覆盖模型配置

## Discussion

### 关键决策点

**1. 配置层级**
- 问题：subagent model 应该在哪个层级配置？
- 决策：同时支持全局配置（`~/.neovate/config.json`）和项目配置（`.neovate/config.json`），项目配置优先级更高
- 理由：与现有配置系统保持一致，提供最大灵活性

**2. 配置粒度**
- 问题：应该统一配置还是分别配置每个 subagent 类型？
- 决策：为每个 subagent 类型（如 explore）分别配置
- 理由：不同 subagent 的任务复杂度不同，需要使用不同能力的模型（如 explore 可用更快的 haiku 模型）

**3. 配置结构**
- 问题：使用什么样的配置键结构？
- 决策：使用 `agent` 作为顶层 key，格式为 `{ "agent": { "explore": { "model": "..." } } }`
- 理由：符合 OpenCode 文档示例，语义清晰，易于扩展

**4. 优先级逻辑**
- 问题：多个配置来源如何确定优先级？
- 决策：按优先级顺序解析：task 工具显式参数 > config.agent.{type}.model > subagent 内置默认 model > 全局 model
- 理由：给予用户最大控制权，同时保证合理的默认行为

### 探索的方案

**方案 1：在 Config 类型中添加 agent 配置字段**（最终采用）
- 在 `Config` 类型中添加 `agent?: Record<string, AgentConfig>` 字段
- 利用现有 ConfigManager 的验证和持久化能力
- 优点：符合现有架构，代码改动最小，易于维护

**方案 2：使用 extensions 字段存储**
- 利用现有 `config.extensions` 字段存储 agent 配置
- 优点：无需修改类型定义，立即可用
- 缺点：语义不明确，agent 是内置功能不应放在 extensions 中

**方案 3：混合方案**
- 顶层 agent 字段 + 支持自定义 agent 扩展
- 优点：最灵活，支持未来扩展
- 缺点：过度设计，不符合 YAGNI 原则

## Approach

采用方案 1，通过在 Config 类型中添加 `agent` 配置字段来实现 subagent model 配置支持。

### 核心特性

1. **配置类型定义**
   - 新增 `AgentConfig` 类型，包含 `model`、`temperature`、`systemPrompt` 等字段
   - 在 `Config` 类型中添加 `agent?: Record<string, AgentConfig>` 字段
   - 为未来扩展预留配置项

2. **Model 解析优先级**
   - Priority 1: Task 工具调用时显式指定的 model 参数
   - Priority 2: Config 中的 `agent.{type}.model` 配置
   - Priority 3: Subagent 内置定义的 model
   - Priority 4: 全局 model（`config.model`）作为最终 fallback

3. **向后兼容性**
   - 不配置 `agent` 字段时，使用内置默认值
   - 现有的 task 工具调用不受影响
   - 配置文件可以逐步迁移

### 用户使用示例

**全局配置示例：**
```json
{
  "model": "anthropic/claude-sonnet-4",
  "agent": {
    "explore": {
      "model": "anthropic/claude-haiku-4-20250514"
    }
  }
}
```

**项目配置示例：**
```json
{
  "agent": {
    "explore": {
      "model": "openai/gpt-4o-mini"
    }
  }
}
```

**CLI 使用示例：**
```bash
# 设置全局配置
neovate config set --global agent.explore.model "anthropic/claude-haiku-4"

# 设置项目配置
neovate config set agent.explore.model "openai/gpt-4o-mini"

# 查看配置
neovate config get agent.explore.model

# 删除配置
neovate config remove agent.explore.model
```

## Architecture

### 技术实现细节

#### 1. 类型定义（src/config.ts）

```typescript
// Agent 配置类型
export type AgentConfig = {
  model?: string;
  // 为未来扩展预留
  temperature?: number;
  systemPrompt?: string;
};

// 在 Config 类型中添加
export type Config = {
  // ... 现有字段
  agent?: Record<string, AgentConfig>;
};
```

#### 2. 配置管理更新（src/config.ts）

更新以下常量：
- `DEFAULT_CONFIG`: 添加 `agent: {}`
- `VALID_CONFIG_KEYS`: 添加 `'agent'`
- `OBJECT_CONFIG_KEYS`: 添加 `'agent'`

ConfigManager 的现有方法（`setConfig`、`getConfig`、`removeConfig`）已支持嵌套对象配置，无需额外修改。

#### 3. Model 解析逻辑（src/agent/executor.ts）

新增 `resolveAgentModel()` 函数：

```typescript
/**
 * Resolve the model for an agent with the following priority:
 * 1. Model explicitly passed in options
 * 2. Model configured in config.agent.{agentType}.model
 * 3. Model defined in agent definition
 * 4. Global model from context.config.model (fallback)
 */
function resolveAgentModel(
  agentType: string,
  options: AgentExecuteOptions,
  definition: AgentDefinition,
  context: Context,
): string {
  // Priority 1: Explicit model from options
  if (options.model && options.model !== MODEL_INHERIT) {
    return options.model;
  }

  // Priority 2: Config agent-specific model
  const configModel = context.config.agent?.[agentType]?.model;
  if (configModel && configModel !== MODEL_INHERIT) {
    return configModel;
  }

  // Priority 3: Agent definition model
  if (definition.model && definition.model !== MODEL_INHERIT) {
    return definition.model;
  }

  // Priority 4: Global fallback
  return context.config.model;
}
```

修改 `executeAgent()` 函数，使用新的解析逻辑：

```typescript
export async function executeAgent(
  options: AgentExecuteOptions,
): Promise<AgentExecutionResult> {
  const { definition, context } = options;
  
  // 使用新的解析函数
  const modelName = resolveAgentModel(
    definition.agentType,
    options,
    definition,
    context,
  );

  // ... 后续逻辑
}
```

### 修改文件清单

1. **src/config.ts**
   - 添加 `AgentConfig` 类型定义
   - 在 `Config` 类型中添加 `agent?` 字段
   - 更新 `DEFAULT_CONFIG`、`VALID_CONFIG_KEYS`、`OBJECT_CONFIG_KEYS`

2. **src/agent/executor.ts**
   - 添加 `resolveAgentModel()` 函数
   - 修改 `executeAgent()` 函数，使用新的 model 解析逻辑

### 测试策略

**单元测试（建议添加到 src/agent/executor.test.ts）：**

```typescript
describe('resolveAgentModel', () => {
  it('should use explicit model from options (priority 1)');
  it('should use config agent model (priority 2)');
  it('should use agent definition model (priority 3)');
  it('should fallback to global model (priority 4)');
  it('should handle MODEL_INHERIT correctly');
});
```

**手动测试场景：**
1. 在全局配置中设置 `agent.explore.model`，验证生效
2. 在项目配置中覆盖，验证优先级
3. 调用 task 工具时传入 model 参数，验证最高优先级
4. 不配置任何 agent.model，验证使用内置默认值

### 未来扩展

`AgentConfig` 类型已为未来扩展预留字段：
- `temperature`: 控制模型的随机性
- `systemPrompt`: 覆盖内置的系统提示词
- 其他 agent 特定配置

这些字段可在需要时逐步实现，不影响当前设计。
